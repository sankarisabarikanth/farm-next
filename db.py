import sqlite3
import os

# Dynamic absolute path relative to db.py to work both locally and in Vercel serverless environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "farm_next.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_db_metadata():
    """Returns general metadata such as min date, max date, and count of unique vegetables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT MIN(date), MAX(date) FROM prices;")
        min_date, max_date = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(DISTINCT vegetable_name) FROM prices;")
        veg_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM prices;")
        total_records = cursor.fetchone()[0]
        
        return {
            'min_date': min_date,
            'max_date': max_date,
            'veg_count': veg_count,
            'total_records': total_records
        }
    finally:
        conn.close()

def get_latest_prices():
    """Returns the most recent price records for all vegetables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # First get the latest date
        cursor.execute("SELECT MAX(date) FROM prices;")
        latest_date = cursor.fetchone()[0]
        
        if not latest_date:
            return []
            
        cursor.execute("""
            SELECT vegetable_name, tamil_name, wholesale_price, 
                   retail_min, retail_max, retail_avg, 
                   minimum_price, maximum_price, unit, market_name, date
            FROM prices
            WHERE date = ?
            ORDER BY vegetable_name;
        """, (latest_date,))
        
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_gainers_losers(limit=5):
    """Calculates price gainers and losers by comparing the latest date with the prior date."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Find the two latest distinct dates
        cursor.execute("SELECT DISTINCT date FROM prices ORDER BY date DESC LIMIT 2;")
        dates = cursor.fetchall()
        if len(dates) < 2:
            return {'gainers': [], 'losers': []}
            
        latest_date = dates[0][0]
        prior_date = dates[1][0]
        
        # Calculate percentage change based on wholesale price
        query = """
            SELECT p1.vegetable_name, p1.tamil_name, 
                   p1.wholesale_price AS price_new, 
                   p2.wholesale_price AS price_old,
                   p1.retail_avg AS retail_new,
                   p2.retail_avg AS retail_old,
                   p1.date AS date_new,
                   ROUND(((p1.wholesale_price - p2.wholesale_price) * 100.0 / p2.wholesale_price), 1) AS pct_change
            FROM prices p1
            JOIN prices p2 ON p1.vegetable_name = p2.vegetable_name
            WHERE p1.date = ? AND p2.date = ?
            ORDER BY pct_change DESC;
        """
        cursor.execute(query, (latest_date, prior_date))
        all_changes = [dict(row) for row in cursor.fetchall()]
        
        # Gainers: pct_change > 0, sorted descending
        gainers = [item for item in all_changes if item['pct_change'] > 0][:limit]
        
        # Losers: pct_change < 0, sorted ascending (biggest price drops first)
        losers = [item for item in all_changes if item['pct_change'] < 0]
        # Sort so that negative changes are ordered from most negative to least negative
        losers.sort(key=lambda x: x['pct_change'])
        losers = losers[:limit]
        
        return {
            'latest_date': latest_date,
            'prior_date': prior_date,
            'gainers': gainers,
            'losers': losers
        }
    finally:
        conn.close()

def get_vegetable_history(name, date_range='6m'):
    """
    Returns historical price records for a specific vegetable.
    Supports filtering ranges: '1m', '3m', '6m', '1y', 'all'
    Uses the latest available date in the database as the reference point.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Find the latest date for this vegetable
        cursor.execute("SELECT MAX(date) FROM prices WHERE vegetable_name = ?;", (name,))
        latest_date = cursor.fetchone()[0]
        if not latest_date:
            return []
            
        # Build query based on date range relative to latest_date
        if date_range == '1m':
            range_sql = "AND date >= date(?, '-30 days')"
        elif date_range == '3m':
            range_sql = "AND date >= date(?, '-90 days')"
        elif date_range == '6m':
            range_sql = "AND date >= date(?, '-180 days')"
        elif date_range == '1y':
            range_sql = "AND date >= date(?, '-365 days')"
        else: # 'all'
            range_sql = ""
            
        query = f"""
            SELECT date, wholesale_price, retail_min, retail_max, retail_avg,
                   minimum_price, maximum_price, unit, market_name, tamil_name
            FROM prices
            WHERE vegetable_name = ? {range_sql}
            ORDER BY date ASC;
        """
        
        if range_sql:
            cursor.execute(query, (name, latest_date))
        else:
            cursor.execute(query, (name,))
            
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_vegetable_summary_stats(name, date_range='6m'):
    """Calculates min, max, avg for wholesale and retail prices in the selected period."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT MAX(date) FROM prices WHERE vegetable_name = ?;", (name,))
        latest_date = cursor.fetchone()[0]
        if not latest_date:
            return {}
            
        if date_range == '1m':
            range_sql = "AND date >= date(?, '-30 days')"
        elif date_range == '3m':
            range_sql = "AND date >= date(?, '-90 days')"
        elif date_range == '6m':
            range_sql = "AND date >= date(?, '-180 days')"
        elif date_range == '1y':
            range_sql = "AND date >= date(?, '-365 days')"
        else: # 'all'
            range_sql = ""
            
        query = f"""
            SELECT MIN(wholesale_price) AS min_wholesale, 
                   MAX(wholesale_price) AS max_wholesale, 
                   ROUND(AVG(wholesale_price), 1) AS avg_wholesale,
                   MIN(retail_avg) AS min_retail,
                   MAX(retail_avg) AS max_retail,
                   ROUND(AVG(retail_avg), 1) AS avg_retail,
                   tamil_name
            FROM prices
            WHERE vegetable_name = ? {range_sql};
        """
        
        if range_sql:
            cursor.execute(query, (name, latest_date))
        else:
            cursor.execute(query, (name,))
            
        res = cursor.fetchone()
        return dict(res) if res else {}
    finally:
        conn.close()
