import mysql.connector
import os
from dotenv import load_dotenv


# Load .env from the ai-service folder
load_dotenv()


def get_db_connection():

    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "stocksense")
    )

    return connection