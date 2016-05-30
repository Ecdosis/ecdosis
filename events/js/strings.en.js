function load_strings() {
    return {
        save:'save',
        delete_event:'cancel event',
        add_event:'add event',
        search:'search',
        day_and_qualifier_set: 'day and qualifier cannot be specified together',
        day_and_qualifier_empty: 'one of day or qualifier is required',
        month_empty: 'specify the month and day or include a qualifier',
        year_empty: 'year cannot be left blank',
        empty_description: '<span class="placeholder">Insert description</span>',
        empty_references: '<span class="placeholder">Insert references</span>',
        empty_title: 'Insert the title of the event',
        month_names: ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep',
            'Oct','Nov','Dec'],
        qualifiers: ['','start','end','from','perhaps','circa'],
        event_types: ['biography','composition','letter','location','other']
    };
}
