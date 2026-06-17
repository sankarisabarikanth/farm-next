from flask import Flask, render_template, jsonify, request, abort
import db

app = Flask(__name__)

@app.route('/')
def dashboard():
    """Main dashboard route displaying market summary, gainers/losers, and vegetable grid."""
    try:
        metadata = db.get_db_metadata()
        latest_prices = db.get_latest_prices()
        highlights = db.get_gainers_losers(limit=6)
        
        # Calculate some additional metrics for the dashboard
        total_veg = len(latest_prices)
        avg_wholesale = sum(x['wholesale_price'] for x in latest_prices) / total_veg if total_veg > 0 else 0
        avg_retail = sum(x['retail_avg'] for x in latest_prices if x['retail_avg'] is not None) / total_veg if total_veg > 0 else 0
        
        stats = {
            'total_vegetables': metadata['veg_count'],
            'latest_date': metadata['max_date'],
            'min_date': metadata['min_date'],
            'avg_wholesale': round(avg_wholesale, 1),
            'avg_retail': round(avg_retail, 1)
        }
        
        return render_template(
            'index.html', 
            stats=stats, 
            latest_prices=latest_prices, 
            highlights=highlights
        )
    except Exception as e:
        # Simple error response
        return f"An error occurred loading the dashboard: {e}", 500

@app.route('/compare')
def compare():
    """Route displaying the multi-vegetable comparison dashboard."""
    try:
        latest_prices = db.get_latest_prices()
        # Extract unique names and Tamil translations
        vegetables = [{'name': item['vegetable_name'], 'tamil_name': item['tamil_name']} for item in latest_prices]
        return render_template('compare.html', vegetables=vegetables)
    except Exception as e:
        return f"An error occurred loading the comparison page: {e}", 500

@app.route('/vegetable/<name>')
def vegetable_detail(name):
    """Detailed view for a specific vegetable, showing statistics and history."""
    # Validate vegetable exists
    stats_6m = db.get_vegetable_summary_stats(name, '6m')
    if not stats_6m or stats_6m.get('tamil_name') is None:
        abort(404, description=f"Vegetable '{name}' not found.")
        
    latest_prices = db.get_latest_prices()
    # Find current vegetable details from latest prices
    current_details = next((item for item in latest_prices if item['vegetable_name'] == name), None)
    
    return render_template(
        'details.html',
        name=name,
        tamil_name=stats_6m.get('tamil_name', ''),
        current=current_details,
        initial_stats=stats_6m
    )

@app.route('/api/vegetable/<name>')
def api_vegetable_data(name):
    """API endpoint returning historical prices and range-specific summary stats as JSON."""
    date_range = request.args.get('range', '6m')
    if date_range not in ['1m', '3m', '6m', '1y', 'all']:
        return jsonify({'error': 'Invalid date range. Choose from 1m, 3m, 6m, 1y, all.'}), 400
        
    stats = db.get_vegetable_summary_stats(name, date_range)
    if not stats or stats.get('tamil_name') is None:
        return jsonify({'error': f"Vegetable '{name}' not found"}), 404
        
    history = db.get_vegetable_history(name, date_range)
    
    return jsonify({
        'name': name,
        'tamil_name': stats.get('tamil_name'),
        'range': date_range,
        'stats': {
            'min_wholesale': stats.get('min_wholesale'),
            'max_wholesale': stats.get('max_wholesale'),
            'avg_wholesale': stats.get('avg_wholesale'),
            'min_retail': stats.get('min_retail'),
            'max_retail': stats.get('max_retail'),
            'avg_retail': stats.get('avg_retail')
        },
        'history': history
    })

@app.errorhandler(404)
def page_not_found(e):
    return render_template('base.html', error_title="404 - Page Not Found", error_message=e.description or "The requested resource could not be found."), 404

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
