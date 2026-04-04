from flask import Flask, render_template, request, jsonify
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

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
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
        "redirect": "/Calendar.html"
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