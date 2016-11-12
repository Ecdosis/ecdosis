/**
 * A pseudo drop-down menu for selecting and editing versions
 * This is required because regular select doesn't handle events
 * in options in Safari and Chrome and probably IE.
 * @param target id of the element to attach to
 * @param prompt prompt to precede version name
 * @param selectHandler function to handle option selections
 * @param menuHandler function to handle menu clicks or null
 */
function DropDown(target,prompt,selectHandler,menuHandler) {
    this.prompt = prompt;
    this.target = target;
	this.val = '';
	this.index = -1;
    this.selectHandler = selectHandler; // takes li element as single argument
    this.menuHandler = menuHandler; 
	var self = this;
    var html = '<span>'+self.prompt+'</span><ul class="dropdown" tabindex="1"></ul>';
    this.dd = jQuery('#'+target);
	this.dd.empty();
	this.dd.off("click");
	this.dd.append(html);
    this.dd.attr("class","dropdowns");
    this.dd.attr("tabindex","1");
    this.placeholder = this.dd.children('span');
	
    /**
     * Ensure that the new option fits the menu header
     * @param text the text of the item
     */
    this.resizeForOption = function(text) {
        var select = jQuery("#"+this.target);
        var prompt = jQuery("#"+this.target+" span").first();
        var selectWidth = select.width();
        var promptWidth = prompt.width();
        // test if select can take the new option text
        jQuery('body').append('<span id="li-test">'+self.prompt+text+'</span>');
        var test = jQuery("#li-test");
        var font = prompt.css("font");
        var fontSize = prompt.css("font-size");
        var fontWeight = prompt.css("font-weight");
        test.css("font",font);
        test.css("font-size",fontSize);
        test.css("font-weight",fontWeight);
        var testWidth = test.width();
        test.remove();
        if ( testWidth+60 > selectWidth )
            select.width(testWidth+60);
    };
    /**
     * Add an option to the pseudo-select
     * @param val the "value" of the item
     * @param text the text it displays (option content)
     * @param edithandler handler for right-clicks 
     * @param before the option before which to insert (optional)
     */
    this.addOption = function(val,text,edithandler,before){
        var html = '<li data-value="'+val+'"><a href="#">'+text+'</a></li>';
        var list = jQuery("#"+self.target+" ul");
        if ( before == undefined )
            list.append(html);
        else
            jQuery("#"+self.target+" li").eq(before).before(html);
        var opt = jQuery("#"+self.target+' li[data-value="'+val+'"]');
        if ( edithandler != null )
        {
            opt.mousedown(edithandler);
            opt.mouseup(function(e){
                if ( e.which==3 )
                {
                    e.preventDefault();
                    return false;
                }
            });
        }
        opt.click(function(e){
		    var li = jQuery(this);
	        var liVal = li.attr("data-value");
            if ( liVal != "new-version" )
            {
                self.val = liVal;
	            self.index = li.index();
	            self.placeholder.text(self.prompt+li.text());
            }
            else
                self.newVersion = true;
            self.selectHandler(e.target);
	    });
        this.resizeForOption(text);
        if ( this.val == undefined || this.val.length==0 )
        {
            this.val = val;
            this.index = 0;
            this.placeholder.text(this.prompt+text);
        }
    };
    /**
     * Get the current value of the dropdown
     * @return a text value (new-version means "New Version is selected")
     */
    this.getValue = function() {
        if ( this.newVersion )
            return "new-version";
        else
            return this.val;
    };
    /**
     * Call this when you are finished with the new version dialog
     */
    this.cancelNewVersion = function(){
        this.newVersion = false;
    };
	/**
     * Get the current text of the dropdown
     * @return a text value
     */
    this.text = function() {
        var text = jQuery("#"+self.target+" li").eq(this.index).text();
        console.log("text="+text+" index="+this.index);
        return text;
    };
    /**
     * Set the select menu to the given value
     */
    this.selectByVal = function(value) {
        jQuery("#"+self.target+" li").each(function(){
            var li = jQuery(this);
            if ( li.attr("data-value") == value )
            {
                self.index = li.index();
		        self.placeholder.text(self.prompt+li.text());
            }
        });
    };
    /**
     * Get the long name corresponding to a version value
     */
    this.getLongName = function(value) {
        var text;
        jQuery("#"+self.target+" li").each(function(){
            var li = jQuery(this);
            if ( li.attr("data-value") == value )
            {
                text = li.text();
            }
        });
        return text;
    };
    
    /**
     * Insert new option before the last one
     * @param value the value of the option
     * @param text the text in it to display
     * @param edithandler handler for editing the text
     */
    this.beforeLast = function(value,text,edithandler) {
        var before = jQuery("#"+self.target+" li").length-1;
        this.addOption(value,text,edithandler,before);
    };
	/**
	 * User clicked on the menu to activate it
     */
    this.dd.click(function(event){
        jQuery(this).toggleClass('active');
		if ( self.menuHandler != null )
			self.menuHandler();
	});
    jQuery(document).contextmenu(function(e){
        e.preventDefault();
    });
    var width = jQuery("#"+self.target+" span").outerWidth(true)+60;
    jQuery("#"+self.target).width(width);
}

