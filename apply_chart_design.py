from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
import copy

# Load both presentations
prs_source = Presentation('SNED-Capstone-Defense (1).pptx')
prs_target = Presentation('City Vet.pptx')

# City Vet correct data
cityvet_data = {
    8: {  # Slide 9 (index 8)
        'chart_type': XL_CHART_TYPE.BAR_CLUSTERED,
        'categories': [
            "Loads pet records in acceptable time",
            "Clear message after submitted action",
            "Form for pet owner information",
            "Prompt response on registration"
        ],
        'series': [
            ("Weighted mean", [4.44, 4.40, 4.38, 4.34])
        ],
        'title': None,
        'has_legend': False,
    },
    9: {  # Slide 10 (index 9)
        'chart_type': XL_CHART_TYPE.COLUMN_CLUSTERED,
        'categories': [
            "Functional Suitability",
            "Performance Efficiency",
            "Usability",
            "Overall"
        ],
        'series': [
            ("End users (n = 50)", [4.25, 4.28, 4.22, 4.25])
        ],
        'title': None,
        'has_legend': True,
        'legend_pos': XL_LEGEND_POSITION.TOP,
    },
    10: {  # Slide 11 (index 10)
        'chart_type': XL_CHART_TYPE.BAR_CLUSTERED,
        'categories': [
            "Functional Suitability",
            "Performance Efficiency",
            "Usability",
            "Reliability",
            "Security"
        ],
        'series': [
            ("Weighted mean", [4.93, 4.87, 5.00, 4.97, 4.97])
        ],
        'title': None,
        'has_legend': False,
    }
}

def extract_formatting(chart):
    """Extract visual formatting from a chart"""
    fmt = {}
    
    # Chart style
    # Note: python-pptx doesn't expose chart.style directly
    
    # Legend
    fmt['has_legend'] = chart.has_legend
    if chart.has_legend:
        fmt['legend_position'] = chart.legend.position
        fmt['legend_include_in_layout'] = chart.legend.include_in_layout
        # Legend font
        if chart.legend.font:
            fmt['legend_font_size'] = chart.legend.font.size
            try:
                if chart.legend.font.color and hasattr(chart.legend.font.color, 'type') and chart.legend.font.color.type != 0:
                    fmt['legend_font_color'] = chart.legend.font.color.rgb
            except:
                pass
            fmt['legend_font_bold'] = chart.legend.font.bold
            fmt['legend_font_name'] = chart.legend.font.name
    
    # Title
    fmt['has_title'] = chart.has_title
    if chart.has_title and chart.chart_title.text_frame.paragraphs:
        p = chart.chart_title.text_frame.paragraphs[0]
        if p.runs:
            fmt['title_font_size'] = p.runs[0].font.size
            try:
                if p.runs[0].font.color and hasattr(p.runs[0].font.color, 'type') and p.runs[0].font.color.type != 0:
                    fmt['title_font_color'] = p.runs[0].font.color.rgb
            except:
                pass
            fmt['title_font_bold'] = p.runs[0].font.bold
            fmt['title_font_name'] = p.runs[0].font.name
    
    # Plot area formatting
    if chart.plots:
        plot = chart.plots[0]
        fmt['gap_width'] = plot.gap_width if hasattr(plot, 'gap_width') else None
        fmt['overlap'] = plot.overlap if hasattr(plot, 'overlap') else None
        
        # Category axis - for bar charts this is the vertical axis
        if hasattr(plot, 'category_axis') and plot.category_axis:
            cat_axis = plot.category_axis
            fmt['cat_axis_visible'] = cat_axis.visible
            fmt['cat_axis_tick_labels'] = cat_axis.tick_labels
            if cat_axis.tick_labels and cat_axis.tick_labels.font:
                fmt['cat_axis_font_size'] = cat_axis.tick_labels.font.size
                try:
                    if cat_axis.tick_labels.font.color and hasattr(cat_axis.tick_labels.font.color, 'type') and cat_axis.tick_labels.font.color.type != 0:
                        fmt['cat_axis_font_color'] = cat_axis.tick_labels.font.color.rgb
                except:
                    pass
                fmt['cat_axis_font_bold'] = cat_axis.tick_labels.font.bold
                fmt['cat_axis_font_name'] = cat_axis.tick_labels.font.name
            fmt['cat_axis_major_gridlines'] = cat_axis.has_major_gridlines
            if cat_axis.has_major_gridlines and cat_axis.major_gridlines.format.line:
                fmt['cat_axis_gridline_color'] = cat_axis.major_gridlines.format.line.color.rgb
                fmt['cat_axis_gridline_width'] = cat_axis.major_gridlines.format.line.width
        
        # Value axis - for bar charts this is the horizontal axis
        if hasattr(plot, 'value_axis') and plot.value_axis:
            val_axis = plot.value_axis
            fmt['val_axis_visible'] = val_axis.visible
            fmt['val_axis_tick_labels'] = val_axis.tick_labels
            if val_axis.tick_labels and val_axis.tick_labels.font:
                fmt['val_axis_font_size'] = val_axis.tick_labels.font.size
                try:
                    if val_axis.tick_labels.font.color and hasattr(val_axis.tick_labels.font.color, 'type') and val_axis.tick_labels.font.color.type != 0:
                        fmt['val_axis_font_color'] = val_axis.tick_labels.font.color.rgb
                except:
                    pass
                fmt['val_axis_font_bold'] = val_axis.tick_labels.font.bold
                fmt['val_axis_font_name'] = val_axis.tick_labels.font.name
            fmt['val_axis_major_gridlines'] = val_axis.has_major_gridlines
            if val_axis.has_major_gridlines and val_axis.major_gridlines.format.line:
                fmt['val_axis_gridline_color'] = val_axis.major_gridlines.format.line.color.rgb
                fmt['val_axis_gridline_width'] = val_axis.major_gridlines.format.line.width
            fmt['val_axis_number_format'] = val_axis.number_format
            fmt['val_axis_min'] = val_axis.minimum
            fmt['val_axis_max'] = val_axis.maximum
        
        # Series formatting
        fmt['series_formats'] = []
        for series in plot.series:
            s_fmt = {}
            if series.format and series.format.fill:
                if series.format.fill.type:
                    s_fmt['fill_type'] = series.format.fill.type
                if series.format.fill.fore_color:
                    try:
                        s_fmt['fill_color'] = series.format.fill.fore_color.rgb
                    except:
                        pass
            # Data labels
            s_fmt['has_data_labels'] = hasattr(series, 'data_labels') and series.data_labels is not None
            if s_fmt['has_data_labels']:
                dl = series.data_labels
                s_fmt['data_label_show_value'] = dl.show_value
                s_fmt['data_label_show_category'] = dl.show_category_name
                s_fmt['data_label_show_series'] = dl.show_series_name
                s_fmt['data_label_position'] = dl.position
                if dl.font:
                    s_fmt['data_label_font_size'] = dl.font.size
                    try:
                        if dl.font.color and hasattr(dl.font.color, 'type') and dl.font.color.type != 0:
                            s_fmt['data_label_font_color'] = dl.font.color.rgb
                    except:
                        pass
                    s_fmt['data_label_font_bold'] = dl.font.bold
                    s_fmt['data_label_font_name'] = dl.font.name
            fmt['series_formats'].append(s_fmt)
    
    return fmt

def apply_formatting(chart, fmt, cityvet_info):
    """Apply formatting to target chart"""
    # Legend
    chart.has_legend = fmt.get('has_legend', False)
    if chart.has_legend:
        if 'legend_position' in fmt:
            chart.legend.position = fmt['legend_position']
        if 'legend_include_in_layout' in fmt:
            chart.legend.include_in_layout = fmt['legend_include_in_layout']
        if 'legend_font_size' in fmt and fmt['legend_font_size']:
            chart.legend.font.size = fmt['legend_font_size']
        if 'legend_font_color' in fmt and fmt['legend_font_color']:
            chart.legend.font.color.rgb = fmt['legend_font_color']
        if 'legend_font_bold' in fmt and fmt['legend_font_bold'] is not None:
            chart.legend.font.bold = fmt['legend_font_bold']
        if 'legend_font_name' in fmt and fmt['legend_font_name']:
            chart.legend.font.name = fmt['legend_font_name']
    
    # Title
    if fmt.get('has_title', False):
        chart.has_title = True
        if chart.chart_title.text_frame.paragraphs:
            p = chart.chart_title.text_frame.paragraphs[0]
            if p.runs:
                if 'title_font_size' in fmt and fmt['title_font_size']:
                    p.runs[0].font.size = fmt['title_font_size']
                if 'title_font_color' in fmt and fmt['title_font_color']:
                    p.runs[0].font.color.rgb = fmt['title_font_color']
                if 'title_font_bold' in fmt and fmt['title_font_bold'] is not None:
                    p.runs[0].font.bold = fmt['title_font_bold']
                if 'title_font_name' in fmt and fmt['title_font_name']:
                    p.runs[0].font.name = fmt['title_font_name']
    else:
        chart.has_title = False
    
    # Plot area
    if chart.plots:
        plot = chart.plots[0]
        if 'gap_width' in fmt and fmt['gap_width'] is not None:
            plot.gap_width = fmt['gap_width']
        if 'overlap' in fmt and fmt['overlap'] is not None:
            plot.overlap = fmt['overlap']
        
        # Category axis (check if exists - for bar charts this is vertical)
        if hasattr(plot, 'category_axis') and plot.category_axis:
            cat_axis = plot.category_axis
            if 'cat_axis_visible' in fmt:
                cat_axis.visible = fmt['cat_axis_visible']
            if 'cat_axis_font_size' in fmt and fmt['cat_axis_font_size']:
                cat_axis.tick_labels.font.size = fmt['cat_axis_font_size']
            if 'cat_axis_font_color' in fmt and fmt['cat_axis_font_color']:
                cat_axis.tick_labels.font.color.rgb = fmt['cat_axis_font_color']
            if 'cat_axis_font_bold' in fmt and fmt['cat_axis_font_bold'] is not None:
                cat_axis.tick_labels.font.bold = fmt['cat_axis_font_bold']
            if 'cat_axis_font_name' in fmt and fmt['cat_axis_font_name']:
                cat_axis.tick_labels.font.name = fmt['cat_axis_font_name']
            if 'cat_axis_major_gridlines' in fmt:
                cat_axis.has_major_gridlines = fmt['cat_axis_major_gridlines']
                if fmt['cat_axis_major_gridlines'] and 'cat_axis_gridline_color' in fmt:
                    cat_axis.major_gridlines.format.line.color.rgb = fmt['cat_axis_gridline_color']
                if fmt['cat_axis_major_gridlines'] and 'cat_axis_gridline_width' in fmt:
                    cat_axis.major_gridlines.format.line.width = fmt['cat_axis_gridline_width']
        
        # Value axis (for bar charts this is horizontal)
        if hasattr(plot, 'value_axis') and plot.value_axis:
            val_axis = plot.value_axis
            if 'val_axis_visible' in fmt:
                val_axis.visible = fmt['val_axis_visible']
            if 'val_axis_font_size' in fmt and fmt['val_axis_font_size']:
                val_axis.tick_labels.font.size = fmt['val_axis_font_size']
            if 'val_axis_font_color' in fmt and fmt['val_axis_font_color']:
                val_axis.tick_labels.font.color.rgb = fmt['val_axis_font_color']
            if 'val_axis_font_bold' in fmt and fmt['val_axis_font_bold'] is not None:
                val_axis.tick_labels.font.bold = fmt['val_axis_font_bold']
            if 'val_axis_font_name' in fmt and fmt['val_axis_font_name']:
                val_axis.tick_labels.font.name = fmt['val_axis_font_name']
            if 'val_axis_major_gridlines' in fmt:
                val_axis.has_major_gridlines = fmt['val_axis_major_gridlines']
                if fmt['val_axis_major_gridlines'] and 'val_axis_gridline_color' in fmt:
                    val_axis.major_gridlines.format.line.color.rgb = fmt['val_axis_gridline_color']
                if fmt['val_axis_major_gridlines'] and 'val_axis_gridline_width' in fmt:
                    val_axis.major_gridlines.format.line.width = fmt['val_axis_gridline_width']
            if 'val_axis_number_format' in fmt and fmt['val_axis_number_format']:
                val_axis.number_format = fmt['val_axis_number_format']
            if 'val_axis_min' in fmt and fmt['val_axis_min'] is not None:
                val_axis.minimum = fmt['val_axis_min']
            if 'val_axis_max' in fmt and fmt['val_axis_max'] is not None:
                val_axis.maximum = fmt['val_axis_max']
        
        # Series formatting
        for j, series in enumerate(plot.series):
            if j < len(fmt['series_formats']):
                s_fmt = fmt['series_formats'][j]
                if 'fill_color' in s_fmt:
                    series.format.fill.solid()
                    series.format.fill.fore_color.rgb = s_fmt['fill_color']
                if 'has_data_labels' in s_fmt:
                    series.has_data_labels = s_fmt['has_data_labels']
                    if series.has_data_labels:
                        dl = series.data_labels
                        if 'data_label_show_value' in s_fmt:
                            dl.show_value = s_fmt['data_label_show_value']
                        if 'data_label_show_category' in s_fmt:
                            dl.show_category_name = s_fmt['data_label_show_category']
                        if 'data_label_show_series' in s_fmt:
                            dl.show_series_name = s_fmt['data_label_show_series']
                        if 'data_label_position' in s_fmt and s_fmt['data_label_position']:
                            dl.position = s_fmt['data_label_position']
                        if 'data_label_font_size' in s_fmt and s_fmt['data_label_font_size']:
                            dl.font.size = s_fmt['data_label_font_size']
                        if 'data_label_font_color' in s_fmt and s_fmt['data_label_font_color']:
                            dl.font.color.rgb = s_fmt['data_label_font_color']
                        if 'data_label_font_bold' in s_fmt and s_fmt['data_label_font_bold'] is not None:
                            dl.font.bold = s_fmt['data_label_font_bold']

# Process each slide
for slide_idx in [8, 9, 10]:
    print(f"\n=== Processing Slide {slide_idx+1} ===")
    
    # Extract formatting from source
    src_slide = prs_source.slides[slide_idx]
    src_fmt = None
    for shape in src_slide.shapes:
        if shape.has_chart:
            src_fmt = extract_formatting(shape.chart)
            print(f"  Extracted formatting from source")
            print(f"    Legend: {src_fmt.get('has_legend')}, pos={src_fmt.get('legend_position')}")
            print(f"    Title: {src_fmt.get('has_title')}")
            print(f"    Series formats: {len(src_fmt.get('series_formats', []))}")
            for k, sf in enumerate(src_fmt.get('series_formats', [])):
                print(f"      Series {k}: fill={sf.get('fill_color')}, data_labels={sf.get('has_data_labels')}")
            break
    
    # Apply to target with City Vet data
    tgt_slide = prs_target.slides[slide_idx]
    cv_data = cityvet_data[slide_idx]
    
    for shape in tgt_slide.shapes:
        if shape.has_chart:
            chart = shape.chart
            
            # Replace data
            chart_data = CategoryChartData()
            chart_data.categories = cv_data['categories']
            for name, values in cv_data['series']:
                chart_data.add_series(name, values)
            chart.replace_data(chart_data)
            
            # Set legend
            chart.has_legend = cv_data.get('has_legend', False)
            if chart.has_legend and 'legend_pos' in cv_data:
                chart.legend.position = cv_data['legend_pos']
            
            # Set title
            if cv_data.get('title'):
                chart.has_title = True
                chart.chart_title.text_frame.text = cv_data['title']
            else:
                chart.has_title = False
            
            # Apply formatting
            if src_fmt:
                apply_formatting(chart, src_fmt, cv_data)
            
            print(f"  Applied City Vet data + SNED formatting")
            print(f"    Categories: {cv_data['categories']}")
            for name, vals in cv_data['series']:
                print(f"    Series: {name} = {vals}")

# Save
output_path = 'City Vet.pptx'
prs_target.save(output_path)
print(f"\nSaved to {output_path}")