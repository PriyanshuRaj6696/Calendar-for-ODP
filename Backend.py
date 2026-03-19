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
    return render_template('Calendar.html') # Starts with calendar.html

# Route to display standard table on webport.html
@app.route('/open-standard', methods=['GET'])
def standardcontainer():
    return render_template('standardtable.html')

if __name__ == '__main__':
    app.run(debug=True)