/**
 * A pseudo drop-down menu for selecting and editing versions
 * This is required because regular select doesn't handle events
 * in options in Safari and Chrome and probably IE.
 */
function DropDown(target,prompt,handler) {
    this.prompt = prompt;
    this.target = target;
	this.val = '';
	this.index = -1;
    this.handler = handler; // takes li element as single argument
	var self = this;
    var html = '<span>'+self.prompt+'</span><ul class="dropdown" tabindex="1"></ul>';
    this.dd = jQuery('#'+target);
	this.dd.append(html);
    this.dd.attr("class","dropdowns");
    this.dd.attr("tabindex","1");
    this.placeholder = this.dd.children('span');
	
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
        opt.mousedown(edithandler);
        opt.mouseup(function(e){
            if ( e.which==3 )
            {
                console.log("right mouse up");
                e.preventDefault();
                return false;
            }
            else
                console.log("no right mouse up");
        });
        opt.click(function(e){
		    var li = jQuery(this);
	        self.val = li.attr("data-value");
	        self.index = li.index();
	        self.placeholder.text(self.prompt+li.text());
            self.handler(e.target);
            console.log("click");
	    });
        var select = jQuery("#"+self.target);
        var prompt = jQuery("#"+self.target+" span").first();
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
        if ( testWidth > selectWidth )
            select.width(testWidth+60);
    };
    /**
     * Get the current value of the dropdown
     * @return a text value
     */
    this.getValue = function() {
        return this.val;
    };
	/**
     * Get the current text of the dropdown
     * @return a text value
     */
    this.text = function() {
        return jQuery("#"+self.target+" li").eq(this.index).text();
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
     * Insert new option before the last one
     * @param value the value of the option
     * @param text the text in it to display
     * @param edithandler handler for editing the text
     */
    this.beforeLast = function(value,text,edithandler) {
        var before = jQuery("#"+self.target+" li").length-1;
        this.addOption(value,text,edithandler,before);
    };
    self.dd.click(function(event){
        jQuery(this).toggleClass('active');
	});
    jQuery(document).contextmenu(function(e){
        e.preventDefault();
    });
    var width = jQuery("#"+self.target+" span").outerWidth(true)+60;
    jQuery("#"+self.target).width(width);
}

