// Farm Next Chart & Detail View JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // If we're not on a detail page with a vegetable name, do nothing
    if (typeof VEGETABLE_NAME === 'undefined') return;

    let chart = null;
    let historyData = [];
    let currentPage = 1;
    const rowsPerPage = 15;

    // Elements
    const chartLoading = document.getElementById('chart-loading');
    const chartContainer = document.getElementById('price-chart');
    const timelineSelector = document.getElementById('timeline-selector');
    const tableBody = document.getElementById('table-body');
    const paginationInfo = document.getElementById('pagination-info');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const tableRowCount = document.getElementById('table-row-count');

    // Range Stats Elements
    const wholesaleMin = document.getElementById('summary-wholesale-min');
    const wholesaleMax = document.getElementById('summary-wholesale-max');
    const wholesaleAvg = document.getElementById('summary-wholesale-avg');
    const retailMin = document.getElementById('summary-retail-min');
    const retailMax = document.getElementById('summary-retail-max');
    const retailAvg = document.getElementById('summary-retail-avg');
    const rangeLabels = document.querySelectorAll('.selected-range-label');

    // Date range helper maps for captions
    const rangeNameMap = {
        '1m': '1 Month',
        '3m': '3 Months',
        '6m': '6 Months',
        '1y': '1 Year',
        'all': 'All Time'
    };

    // Render Raw Data Table with Pagination
    const renderTable = () => {
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (historyData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data-msg">No history data available for this range.</td></tr>';
            tableRowCount.textContent = 'Showing 0 records';
            paginationInfo.textContent = 'Page 1 of 1';
            btnPrevPage.disabled = true;
            btnNextPage.disabled = true;
            return;
        }

        const totalPages = Math.ceil(historyData.length / rowsPerPage);
        
        // Boundaries
        const start = (currentPage - 1) * rowsPerPage;
        const end = Math.min(start + rowsPerPage, historyData.length);
        
        // Show reverse-chronological order in table (newest first)
        // Note: historyData is in chronological order (oldest first) for charting,
        // so we read it backwards for the table.
        const reversedData = [...historyData].reverse();
        const pageItems = reversedData.slice(start, end);

        pageItems.forEach(item => {
            const tr = document.createElement('tr');
            
            // Format retail range
            let retailRangeStr = 'N/A';
            if (item.retail_min !== null && item.retail_max !== null) {
                retailRangeStr = `₹${Math.round(item.retail_min)} - ₹${Math.round(item.retail_max)}`;
            }
            
            // Format retail average
            const retailAvgStr = item.retail_avg !== null ? `₹${item.retail_avg.toFixed(1)}` : 'N/A';
            
            tr.innerHTML = `
                <td style="font-weight: 600;">${item.date}</td>
                <td class="font-jakarta text-emerald" style="font-weight: 700;">₹${item.wholesale_price}</td>
                <td class="font-jakarta text-blue" style="font-weight: 700;">${retailAvgStr}</td>
                <td class="font-jakarta" style="color: var(--text-secondary);">${retailRangeStr}</td>
                <td class="font-jakarta" style="color: var(--text-muted);">₹${item.minimum_price}</td>
                <td class="font-jakarta" style="color: var(--text-muted);">₹${item.maximum_price}</td>
            `;
            tableBody.appendChild(tr);
        });

        // Update indicators
        tableRowCount.textContent = `Showing ${start + 1}-${end} of ${historyData.length} records`;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        
        btnPrevPage.disabled = currentPage === 1;
        btnNextPage.disabled = currentPage === totalPages;
    };

    // Render or Update ApexCharts
    const renderChart = (data) => {
        if (!chartContainer) return;

        const categories = data.map(item => item.date);
        const wholesaleSeries = data.map(item => item.wholesale_price);
        const retailSeries = data.map(item => item.retail_avg);
        const minSeries = data.map(item => item.minimum_price);
        const maxSeries = data.map(item => item.maximum_price);

        const options = {
            series: [
                {
                    name: 'Wholesale Price',
                    data: wholesaleSeries
                },
                {
                    name: 'Retail Avg Price',
                    data: retailSeries
                }
            ],
            chart: {
                type: 'area',
                height: 380,
                background: 'transparent',
                foreColor: '#94a3b8', // slate 400
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 400,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 250
                    }
                }
            },
            colors: ['#10b981', '#3b82f6'], // emerald, blue
            stroke: {
                curve: 'smooth',
                width: 3
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.2,
                    opacityTo: 0.0,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: {
                enabled: false
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                strokeDashArray: 3,
                xaxis: {
                    lines: {
                        show: false
                    }
                },
                yaxis: {
                    lines: {
                        show: true
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                categories: categories,
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                labels: {
                    datetimeFormatter: {
                        year: 'yyyy',
                        month: 'MMM yyyy',
                        day: 'dd MMM',
                        hour: 'HH:mm'
                    }
                }
            },
            yaxis: {
                title: {
                    text: 'Price (₹/kg)',
                    style: {
                        fontWeight: 600,
                        fontFamily: 'Plus Jakarta Sans'
                    }
                },
                labels: {
                    formatter: function (val) {
                        return '₹' + Math.round(val);
                    }
                }
            },
            tooltip: {
                theme: 'dark',
                x: {
                    format: 'dd MMM yyyy'
                },
                y: {
                    formatter: function (val) {
                        return val !== null ? '₹' + val.toFixed(1) + ' /kg' : 'N/A';
                    }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans',
                markers: {
                    radius: 12
                }
            }
        };

        if (chart) {
            // Smoothly update the chart options and series data
            chart.updateOptions({
                xaxis: {
                    categories: categories
                }
            });
            chart.updateSeries([
                {
                    name: 'Wholesale Price',
                    data: wholesaleSeries
                },
                {
                    name: 'Retail Avg Price',
                    data: retailSeries
                }
            ]);
        } else {
            // Instantiate new chart
            chart = new ApexCharts(chartContainer, options);
            chart.render();
        }
    };

    // Load price history and update UI details
    const loadData = (range) => {
        chartLoading.classList.remove('hidden');
        
        fetch(`/api/vegetable/${encodeURIComponent(VEGETABLE_NAME)}?range=${range}`)
            .then(res => {
                if (!res.ok) throw new Error('Network response not ok');
                return res.json();
            })
            .then(data => {
                historyData = data.history;
                
                // Update Timeline range titles
                const rangeLabel = rangeNameMap[range] || '6 Months';
                rangeLabels.forEach(el => el.textContent = rangeLabel);
                
                // Update stats
                wholesaleMin.textContent = `₹${data.stats.min_wholesale}`;
                wholesaleMax.textContent = `₹${data.stats.max_wholesale}`;
                wholesaleAvg.textContent = `₹${data.stats.avg_wholesale}`;
                
                retailMin.textContent = data.stats.min_retail !== null ? `₹${Math.round(data.stats.min_retail)}` : 'N/A';
                retailMax.textContent = data.stats.max_retail !== null ? `₹${Math.round(data.stats.max_retail)}` : 'N/A';
                retailAvg.textContent = data.stats.avg_retail !== null ? `₹${data.stats.avg_retail}` : 'N/A';
                
                // Render table and chart
                currentPage = 1;
                renderTable();
                renderChart(historyData);
                
                chartLoading.classList.add('hidden');
            })
            .catch(err => {
                console.error('Error fetching vegetable details:', err);
                chartLoading.classList.add('hidden');
            });
    };

    // Timeline Selector Click handler
    if (timelineSelector) {
        timelineSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.range-btn');
            if (!btn) return;
            
            // Toggle active styling
            timelineSelector.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Load new date range data
            const range = btn.getAttribute('data-range');
            loadData(range);
        });
    }

    // Pagination Click Handlers
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(historyData.length / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }

    // Initial load with 6 Months range
    loadData('6m');
});
