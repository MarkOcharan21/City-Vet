from pptx import Presentation
from pptx.chart.data import CategoryChartData
from copy import deepcopy
import json

# Load both presentations
prs_source = Presentation('SNED-Capstone-Defense (1).pptx')
prs_target = Presentation('City Vet.pptx')

# Helper to extract chart data and formatting
def extract_chart_info(chart):
    info = {
        'chart_type': chart.chart_type,
        'has_legend': chart.has_legend,
        'legend_position': None,
        'legend_include_in_layout': None,
        'series': [],
        'categories': [],
        'title': None,
    }
    
    if chart.has_legend:
        info['legend_position'] = chart.legend.position
        info['legend_include_in_layout'] = chart.legend.include_in_layout
    
    if chart.has_title:
        info['title'] = chart.chart_title.text_frame.text
    
    # Get categories
    if chart.plots:
        plot = chart.plots[0]
        if plot.categories:
            info['categories'] = [str(c) for c in plot.categories]
        
        # Get series data
        for series in plot.series:
            s_info = {
                'name': series.name,
                'values': [v for v in series.values] if series.values else [],
                'format': {}
            }
            # Try to get series formatting
            if hasattr(series, 'format') and series.format:
                fmt = series.format
                if fmt.fill and fmt.fill.type:
                    s_info['format']['fill_type'] = fmt.fill.type
                    if hasattr(fmt.fill, 'fore_color') and fmt.fill.fore_color:
                        try:
                            s_info['format']['fill_color'] = fmt.fill.fore_color.rgb
                        except:
                            pass
            info['series'].append(s_info)
    
    return info

# Extract charts from source slides 9, 10, 11 (indices 8, 9, 10)
source_charts = []
for slide_idx in [8, 9, 10]:
    slide = prs_source.slides[slide_idx]
    for shape in slide.shapes:
        if shape.has_chart:
            info = extract_chart_info(shape.chart)
            info['slide_idx'] = slide_idx
            source_charts.append(info)
            print(f"Source Slide {slide_idx+1}: Chart type={info['chart_type']}, categories={info['categories']}, series={len(info['series'])}")
            for s in info['series']:
                print(f"  Series: {s['name']} = {s['values']}")

# Apply to target slides 9, 10, 11 (indices 8, 9, 10)
for i, target_slide_idx in enumerate([8, 9, 10]):
    if i >= len(source_charts):
        break
    src_info = source_charts[i]
    slide = prs_target.slides[target_slide_idx]
    for shape in slide.shapes:
        if shape.has_chart:
            chart = shape.chart
            print(f"\nApplying to Target Slide {target_slide_idx+1}...")
            
            # Replace chart data
            chart_data = CategoryChartData()
            chart_data.categories = src_info['categories']
            for s in src_info['series']:
                chart_data.add_series(s['name'], s['values'])
            
            chart.replace_data(chart_data)
            
            # Apply chart style (not available in python-pptx)
            
            # Apply legend settings
            if src_info['has_legend']:
                chart.has_legend = True
                if src_info['legend_position'] is not None:
                    chart.legend.position = src_info['legend_position']
                if src_info['legend_include_in_layout'] is not None:
                    chart.legend.include_in_layout = src_info['legend_include_in_layout']
            else:
                chart.has_legend = False
            
            # Apply title
            if src_info['title']:
                chart.has_title = True
                chart.chart_title.text_frame.text = src_info['title']
            else:
                chart.has_title = False
            
            # Apply series formatting
            if chart.plots:
                plot = chart.plots[0]
                for j, series in enumerate(plot.series):
                    if j < len(src_info['series']):
                        src_series = src_info['series'][j]
                        if src_series['format'].get('fill_color'):
                            try:
                                series.format.fill.solid()
                                series.format.fill.fore_color.rgb = src_series['format']['fill_color']
                            except:
                                pass
            
            print(f"  Applied: categories={src_info['categories']}, series={len(src_info['series'])}")

# Save
output_path = 'City Vet.pptx'
prs_target.save(output_path)
print(f"\nSaved to {output_path}")