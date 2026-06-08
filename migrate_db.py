import sqlite3

def migrate():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE api_keys ADD COLUMN token_limit INTEGER;")
        print("Added token_limit to api_keys")
    except Exception as e:
        print("token_limit already exists or error:", e)
        
    try:
        cursor.execute("ALTER TABLE api_keys ADD COLUMN tokens_consumed INTEGER DEFAULT 0;")
        print("Added tokens_consumed to api_keys")
    except Exception as e:
        print("tokens_consumed already exists or error:", e)
        
    try:
        cursor.execute("ALTER TABLE api_keys ADD COLUMN name VARCHAR DEFAULT 'Default Key';")
        print("Added name to api_keys")
    except Exception as e:
        print("name already exists or error:", e)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
