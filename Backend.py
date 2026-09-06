from flask import Flask, render_template, request, jsonify, url_for
import mysql.connector
import os
from datetime import datetime

app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(__file__),'templates'),
            static_folder=os.path.join(os.path.dirname(__file__),'static'))

# MySQL configuration
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'mysql@127',
    'database': 'CalendarDB'
}


# Start page of the Web Application
@app.route('/')
def index():
    return render_template('login.html') # Starts with login.html

@app.route('/login', methods=['POST'])
def login():
    json_data = request.get_json(silent=True) or {}
    form_data = request.form or {}

    userid = json_data.get('userid')
    password = json_data.get('password')

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    query = "SELECT pwd FROM userpwd WHERE userid = %s"
    cursor.execute(query, (userid,))
    pwd = cursor.fetchone()
    print(f"Query: {query}, Userid: {userid}, Password: {password}, Fetched PWD: {pwd}")
    cursor.close()
    conn.close()

    # Add your login logic here
    if pwd and password == pwd[0]: # Replace with actual authentication logic
        return jsonify({
        "message": "Login successful",
        "redirect": url_for('calendar_page', userid=userid)
    }), 200 # Redirect to calendar page on successful login
    else:
        return jsonify({
            "message": "Invalid userid or password"
        }), 401 # Return error message for invalid credentials


@app.route('/calendar/<userid>', methods=['GET'])
def calendar_page(userid):
    return render_template('Calendar.html', username=userid, userid=userid) # Pass the userid to the calendar page

@app.route('/api/calendar-events/<userid>', methods=['GET'])
def calendar_events(userid):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    query = ('''SELECT c.coursecode, c.coursename, c.professorname, cse.sessiontype, cse.start_time, cse.end_time, cse.repetition, tr.start_date, tr.end_date, ur.year
FROM user ur
JOIN course c 
    ON ur.registered_coursecode = c.coursecode
JOIN coursesession cse 
    ON c.coursecode = cse.coursecode
JOIN trimester tr 
    ON c.trimester_period_id = tr.trimester_period_id
WHERE ur.userid = %s 
  AND ur.coursestatus = 'active';''')
    cursor.execute(query, (userid,))
    tabledata = cursor.fetchall()
    eventtabledata = []
    for row in tabledata:
        course_start_date, course_start_month = map(int, row[7].split("-"))
        course_end_date, course_end_month = map(int, row[8].split("-"))
        course_start_year = int(row[9])
        course_end_year = int(row[9])
        eventtabledata.append({
            "coursecode": row[0],
            "coursename": row[1],
            "professorname": row[2],
            "sessiontype": row[3],
            "start_time": row[4].strftime("%H:%M") if hasattr(row[4], "strftime") else str(row[4]),
            "end_time": row[5].strftime("%H:%M") if hasattr(row[5], "strftime") else str(row[5]),
            "repetition": row[6],
            "start_day": course_start_date,
            "start_month": course_start_month,
            "start_year": course_start_year,
            "end_day": course_end_date,
            "end_month": course_end_month,
            "end_year": course_end_year,
        })
    cursor.close()
    conn.close()
    return jsonify({"username": userid, "events": eventtabledata})

if __name__ == '__main__':
    app.run(debug=True)