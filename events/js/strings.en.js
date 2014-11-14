function load_strings() {
    return {
        save: 'salva',
        delete_event:'delete event',
        add_event:'add event',
        search:'search',
        day_and_qualifier_set: 'day and qualifier cannot both be set',
        day_and_qualifier_empty: 'day and qualifier cannot both be empty',
        month_empty: 'month cannot be empty if day is set or qualifier is empty',
        year_empty: 'year cannot be empty',
        empty_description: '<span class="placeholder">Enter event description</span>',
        empty_references: '<span class="placeholder">Enter references</span>',
        empty_title: 'Enter event title',
        month_names: ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep',
            'Oct','Nov','Dec'],
        qualifiers: ['','early','late','by','perhaps','circa'],
        event_types: ['biography','composition','letter']
    };
}
