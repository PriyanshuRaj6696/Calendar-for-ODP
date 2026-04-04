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


# Function to get table columns
def get_table_with_limit(query, pageno=0, pagelimit=100):
    '''
    Use to get table data and send them to webport.

    Attributes :
        query -> Needs SQL query that can be used to get table data
        pageno -> Defines pages of datalimit set to.
        pagelimit -> Defines no. of rows to get from the asked table.
    '''
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    offset = pageno * pagelimit
    cursor.execute(query, (pagelimit, offset)) # Do remember to add Limit and Offset in query
    tablerows = cursor.fetchall()
    column_names = [desc[0] for desc in cursor.description]  # Fetch column names
    cursor.close()
    conn.close()
    return column_names, tablerows

# Start page of the Web Application
@app.route('/')
def index():
    return render_template('login.html') # Starts with calendar.html


@app.route('/calendar/<username>')
def calendar_page(username):
    '''current_month = datetime.now().strftime("%m")
    current_date = datetime.now().strftime("%d")'''
    current_month = 9
    current_date = 2
    print(f"Current Month: {current_month}")
    print(f"Current Date: {current_date}")
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    query = '''Select c.coursecode, coursename, professorname, sessiontype, start_time, end_time, repetition, start_date, end_date from course as c 
join (Select * from coursesession 
		where coursecode in (Select registered_coursecode from user
			where userid = 001 and coursestatus = "active")) as cse
on c.coursecode = cse.coursecode
join trimester as tr on c.session_id = tr.session_id;'''
    cursor.execute(query)
    tabledata = cursor.fetchall()
    eventtabledata = []
    for row in tabledata:
        course_start_date, course_start_month = row[7].split("-")
        course_end_date, course_end_month = row[8].split("-")
        if current_month >= int(course_start_month) and current_date >= int(course_start_date) and current_month <= int(course_end_month) and current_date <= int(course_end_date):
            eventtabledata.append(row)
    #print(f"Data: {tabledata}, Username: {username}")
    cursor.close()
    conn.close()
    return render_template('Calendar.html', username=username, eventtabledata=eventtabledata)

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')

    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    query = "SELECT pwd FROM userpwd WHERE username = %s"
    cursor.execute(query, (username,))
    pwd = cursor.fetchone()
    print(f"Query: {query}, Username: {username}, Password: {password}, Fetched PWD: {pwd}")
    cursor.close()
    conn.close()

    # Add your login logic here
    if pwd and password == pwd[0]: # Replace with actual authentication logic
        return jsonify({
        "message": "Login successful",
        "redirect": url_for('calendar_page', username=username)
    }), 200 # Redirect to calendar page on successful login
    else:
        return jsonify({
            "message": "Invalid username or password"
        }), 401 # Return error message for invalid credentials

# Route to display standard table on webport.html
@app.route('/open-standard', methods=['GET'])
def standardcontainer():
    return render_template('standardtable.html')

if __name__ == '__main__':
    app.run(debug=True)