// Farm Next Comparison Tool JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Make sure we're on the compare page
    const selectorList = document.getElementById('selector-list');
    const compareChartContainer = document.getElementById('compare-chart');
    
    if (!selectorList || !compareChartContainer) return;

    let activeSelection = []; // List of selected vegetable names
    let currentRange = '6m';
    let chart = null;

    const maxSelect = 5;
    // Curated premium HSL-aligned colors for active comparisons
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']; // Emerald, Blue, Purple, Amber, Pink

    // DOM Elements
    const searchInput = document.getElementById('selector-search');
    const selectorItems = Array.from(selectorList.getElementsByClassName('selector-item'));
    const checkboxes = Array.from(selectorList.querySelectorAll('input[type="checkbox"]'));
    const selectionCount = document.getElementById('selection-count');
    const selectedTagsList = document.getElementById('selected-tags');
    const emptyState = document.getElementById('compare-empty-state');
    const loadingOverlay = document.getElementById('compare-chart-loading');
    const timelineSelector = document.getElementById('compare-timeline-selector');

    // Get color for selection index
    const getColorForIndex = (index) => {
        return colors[index % colors.length];
    };

    // Update checkbox disabled states based on the 5-item selection limit
    const updateCheckboxes = () => {
        const selectedCount = activeSelection.length;
        selectionCount.textContent = `${selectedCount} / ${maxSelect} Selected`;

        checkboxes.forEach(cb => {
            if (!cb.checked) {
                // Disable other checkboxes if max reached
                cb.disabled = selectedCount >= maxSelect;
                cb.closest('.selector-item').style.opacity = selectedCount >= maxSelect ? '0.4' : '1';
                cb.closest('.selector-item').style.cursor = selectedCount >= maxSelect ? 'not-allowed' : 'pointer';
            } else {
                cb.disabled = false;
                cb.closest('.selector-item').style.opacity = '1';
                cb.closest('.selector-item').style.cursor = 'pointer';
            }
        });
    };

    // Update tags display area
    const updateTags = () => {
        selectedTagsList.innerHTML = '';
        
        if (activeSelection.length === 0) {
            const span = document.createElement('span');
            span.className = 'no-selections-text';
            span.id = 'no-tags-text';
            span.textContent = 'No items selected';
            selectedTagsList.appendChild(span);
            return;
        }

        activeSelection.forEach((name, index) => {
            const color = getColorForIndex(index);
            
            // Find tamil name from checkbox attribute
            const cb = checkboxes.find(c => c.value === name);
            const tamil = cb ? cb.getAttribute('data-tamil') : '';
            
            const tag = document.createElement('span');
            tag.className = 'compare-tag';
            tag.style.backgroundColor = `${color}15`;
            tag.style.color = color;
            tag.style.borderColor = `${color}35`;
            tag.innerHTML = `
                <span>${name} <small style="font-size: 0.7rem; opacity: 0.7;">(${tamil})</small></span>
                <i class="fa-solid fa-xmark compare-tag-remove" data-name="${name}"></i>
            `;
            selectedTagsList.appendChild(tag);
        });

        // Set up click handlers on tag removes
        selectedTagsList.querySelectorAll('.compare-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                const cb = checkboxes.find(c => c.value === name);
                if (cb) {
                    cb.checked = false;
                    handleCheckboxChange(cb);
                }
            });
        });
    };

    // Render / Update comparative chart
    const renderChart = (categories, series) => {
        const options = {
            series: series,
            chart: {
                type: 'line',
                height: 380,
                background: 'transparent',
                foreColor: '#94a3b8',
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
                }
            },
            colors: colors.slice(0, series.length),
            stroke: {
                curve: 'smooth',
                width: 3
            },
            dataLabels: {
                enabled: false
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                strokeDashArray: 3,
                yaxis: {
                    lines: { show: true }
                }
            },
            xaxis: {
                type: 'datetime',
                categories: categories,
                axisBorder: { show: false },
                axisTicks: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            yaxis: {
                title: {
                    text: 'Wholesale Price (₹/kg)',
                    style: { fontWeight: 600, fontFamily: 'Plus Jakarta Sans' }
                },
                labels: {
                    formatter: (val) => '₹' + Math.round(val)
                }
            },
            tooltip: {
                theme: 'dark',
                x: { format: 'dd MMM yyyy' },
                y: {
                    formatter: (val) => val !== null ? '₹' + val + ' /kg' : 'N/A'
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'left',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans',
                markers: { radius: 12 }
            }
        };

        if (chart) {
            chart.updateOptions({
                xaxis: { categories: categories },
                colors: colors.slice(0, series.length)
            });
            chart.updateSeries(series);
        } else {
            chart = new ApexCharts(compareChartContainer, options);
            chart.render();
        }
    };

    // Parallel Fetch & Date Alignment Logic
    const loadComparisonData = () => {
        if (activeSelection.length === 0) {
            emptyState.classList.remove('hidden');
            if (chart) {
                chart.destroy();
                chart = null;
            }
            return;
        }

        emptyState.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');

        // Create parallel fetch promises
        const promises = activeSelection.map(name => 
            fetch(`/api/vegetable/${encodeURIComponent(name)}?range=${currentRange}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed fetching ${name}`);
                    return res.json();
                })
        );

        Promise.all(promises)
            .then(results => {
                // 1. Gather all unique dates across all results and sort chronologically
                const allDatesSet = new Set();
                results.forEach(res => {
                    res.history.forEach(item => allDatesSet.add(item.date));
                });
                const sortedDates = Array.from(allDatesSet).sort();

                // 2. Re-align each vegetable history series to the master date list
                const series = results.map(res => {
                    // Create date-to-price lookup map
                    const priceMap = {};
                    res.history.forEach(item => {
                        priceMap[item.date] = item.wholesale_price;
                    });

                    // Build data array filling gaps with null
                    const seriesData = sortedDates.map(date => {
                        const price = priceMap[date];
                        return price !== undefined ? price : null;
                    });

                    return {
                        name: res.name,
                        data: seriesData
                    };
                });

                // 3. Draw chart
                renderChart(sortedDates, series);
                loadingOverlay.classList.add('hidden');
            })
            .catch(err => {
                console.error('Error fetching comparative price sets:', err);
                loadingOverlay.classList.add('hidden');
            });
    };

    // Checkbox Change handler
    const handleCheckboxChange = (checkbox) => {
        const name = checkbox.value;
        
        if (checkbox.checked) {
            if (activeSelection.length < maxSelect) {
                activeSelection.push(name);
            } else {
                checkbox.checked = false; // Block selecting more than 5
            }
        } else {
            activeSelection = activeSelection.filter(item => item !== name);
        }

        updateCheckboxes();
        updateTags();
        loadComparisonData();
    };

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => handleCheckboxChange(cb));
    });

    // Checkbox checklist text search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            selectorItems.forEach(item => {
                const name = item.getAttribute('data-name');
                const tamil = item.getAttribute('data-tamil');
                
                if (name.includes(query) || tamil.includes(query)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    }

    // Timeline selector ranges
    if (timelineSelector) {
        timelineSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.range-btn');
            if (!btn) return;
            
            timelineSelector.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentRange = btn.getAttribute('data-range');
            loadComparisonData();
        });
    }

    // Initial setup
    updateCheckboxes();
    updateTags();
});
