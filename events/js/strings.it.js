function load_strings() {
    return {
        save:'salva',
        delete_event:'cancella evento',
        add_event:'aggiungi evento',
        search:'cerca',
        day_and_qualifier_set: 'day and qualifier cannot both be set',
        day_and_qualifier_empty: 'day and qualifier cannot both be empty',
        month_empty: 'month cannot be empty if day is set or qualifier is empty',
        year_empty: 'year cannot be empty',
        empty_description: '<span class="placeholder">Inserisci descrizione</span>',
        empty_references: '<span class="placeholder">Inserisci referenze</span>',
        empty_title: 'Inserisci il titolo dell\'evento',
        month_names: ['','Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set',
            'Ott','Nov','Dic'],
        qualifiers: ['','inizio','fine','da','forse','circa'],
        event_types: ['biografia','composizione','lettera']
    };
}
