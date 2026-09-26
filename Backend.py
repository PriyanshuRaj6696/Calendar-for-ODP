from flask import Flask, render_template, request, jsonify, url_for
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
import mysql.connector
import os
from argon2 import PasswordHasher
from datetime import datetime

# Initialize PasswordHasher for secure password hashing
ph = PasswordHasher()

# Initialize Flask application and configure template and static folders
app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(__file__),'templates'),
            static_folder=os.path.join(os.path.dirname(__file__),'static'))

# Configure secret key for session management
app.config["SECRET_KEY"] = "your-secret-key"

login_manager = LoginManager()
login_manager.init_app(app)

login_manager.login_view = "login"

# MySQL configuration
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'mysql@127',
    'database': 'CalendarDB'
}


day_mapping = {
    'mon': 1,
    'tue': 2,
    'wed': 3,
    'thu': 4,
    'fri': 5,
    'sat': 6,
    'sun': 0
}


# Start page of the Web Application
@app.route('/')
def index():
    return render_template('login_signin.html') # Starts with login_signin.html

@app.route('/login', methods=['POST', 'GET'])
def login():
    if request.method == 'POST':
        json_data = request.get_json(silent=True) or {}
        form_data = request.form or {}

        userid = json_data.get('userid')
        webpassword = json_data.get('password')

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = "SELECT pwd FROM userpwd WHERE userid = %s"
        cursor.execute(query, (userid,))
        fetcheduser = cursor.fetchone()

        if fetcheduser is None:
            cursor.close()
            conn.close()
            return jsonify({
                "message": "Invalid userid or password."
            }), 401 # Return error message for invalid userid

        hashed_password = fetcheduser[0]

        try:
            ph.verify(hashed_password, webpassword)
            cursor.close()
            conn.close()
            return jsonify({
                "message": "Login successful",
                "redirect": url_for('calendar_page', userid=userid)
            }), 200 # Redirect to calendar page on successful login
        except Exception as e:
            cursor.close()
            conn.close()
            return jsonify({
                "message": "Invalid userid or password."
            }), 401 # Return error message for invalid password
    if request.method == 'GET':
        return render_template('login_signin.html') # Render the login page for GET requests

@app.route('/signup', methods=['POST', 'GET'])
def signup():
    if request.method == 'POST':
        json_data = request.get_json(silent=True) or {}
        form_data = request.form or {}

        username = json_data.get('username')
        userid = json_data.get('userid')
        webpassword = json_data.get('password')

        if len(webpassword) < 10:
            return jsonify({
                "message": "Password must be at least 10 characters long."
            }), 400 # Return error message for short password

        hashed_password = ph.hash(webpassword)

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = "SELECT userid FROM userpwd WHERE userid = %s"
        cursor.execute(query, (userid,))
        fetcheduser = cursor.fetchone()

        if fetcheduser is not None: # Check if the fetched user is not None
            cursor.close()
            conn.close()
            return jsonify({
                "message": "Userid already exists. Please choose a different userid."
            }), 400 # Return error message for existing userid

        query = "INSERT INTO userpwd (userid, username, pwd) VALUES (%s, %s, %s)"
        print(f"Query: {query}, Userid: {userid}, Username: {username}, Hashed PWD: {hashed_password}")
        try:
            cursor.execute(query, (userid, username, hashed_password))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({
                "message": "Signup successful",
                "redirect": url_for('login')
            }), 200 # Redirect to calendar page on successful signup
        except mysql.connector.Error as err:
            cursor.close()
            conn.close()
            return jsonify({
                "message": f"Error: {err}"
            }), 500 # Return error message for database error
    if request.method == 'GET':
        return render_template('login_signup.html') # Render the signup page for GET requests

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

        # Split the repetition string into its components
        eventoccurrences, eventdaylist, eventstartweekday = row[6].split(" ")
        eventdaylist = eventdaylist.split(",")
        eventdaylisttemp = ""
        for day in eventdaylist:
            eventdaylisttemp = eventdaylisttemp + (",") + str(day_mapping[day])
        eventdaylist = eventdaylisttemp[1:]  # Remove the leading comma
        
        # Format the event data for the frontend
        eventtabledata.append({
            "coursecode": row[0],
            "coursename": row[1],
            "professorname": row[2],
            "sessiontype": row[3],
            "start_time": row[4].strftime("%H:%M") if hasattr(row[4], "strftime") else str(row[4]),
            "end_time": row[5].strftime("%H:%M") if hasattr(row[5], "strftime") else str(row[5]),
            "repetition": f"{eventoccurrences} {eventdaylist} {eventstartweekday}",
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