/**
 * global document object
 */
function editor( docid, version1, target, udata )
{
    this.docid = docid;
    this.iOffset = 0;
    this.nInterp = 4;
    this.key = "I tell a settlers tale of the old times";
    // save a copy of the old userdata for later verification
    this.encrypted = udata;
    this.target = target;
    /** flag to reflect if it has been saved */
    this.saved = true;
    /** flag to test if it just needs reflowing, NOT saving */
    this.dirty = false;
    /** default version to edit */
    this.version1 = version1;
    this.forbidden = {17:"Control",16:"Shift",37:"ArrowLeft",18:"Alt",40:"ArrowDown",39:"ArrowRight",38:"ArrowUp"};
    this.undoBuffer = Array();
    this.redoBuffer = Array();
    
    var self = this;
    /**
     * Decode an encrypted userdata string using the key.
     */
    this.editor_decode = function( enc ) {
        var plain = atob(enc);
        var sb = "";
        for ( var i=0;i<plain.length;i++ )
        {
            var kchar = this.key.charCodeAt(i%this.key.length);
            var pchr = plain.charCodeAt(i)^kchar;
            sb += String.fromCharCode(pchr);
        }
        return sb;
    };
    /**
     * Find the height of a line in the textarea
     * @return the lineheight possibly fractional
     */
    this.getLineHeight = function( box )
    {
        var oldNRows = box.attr("rows");
        box.attr("rows","1");
        var height1 = box.height();
        box.attr("rows","2");
        var height2 = box.height();
        this.lineHeight = height2-height1;
        this.ebSlop = height2-(2*this.lineHeight);
        if ( oldNRows != undefined && oldNRows != null && oldNRows.length>0 )
            box.attr("rows",oldNRows);
    };
    /**
     * Get the jQuery object of the current textarea
     * @return a jQuery object textarea
     */
    this.editbox = function(){
        return jQuery("#"+this.current);
    };
    /**
     * Find the longest line in the textarea
     */
    this.recalcText = function()
    {
        var box = this.editbox();
        var text = box.val();
        this.lines = text.split("\n");
        this.longest = 0;
        this.longestLen = 0;
        this.fitLineLength = 0;
        for ( var i=0;i<this.lines.length;i++ )
        {
            if ( this.lines[i].length > this.longestLen )
            {
                this.longest = i;
                this.longestLen = this.lines[i].length;
            }
        }
    };
    /**
     * Extract the source page number
     * @param line the line containing the page number
     */
    this.extractPage = function(line)
    {
        var l = line.trim();
        if ( l.indexOf("[") == 0 )
            l = l.substring(1);
        if ( l.lastIndexOf("]") == l.length-1 )
            l = l.substring(0,l.length-1);
        return l;
    };
    /**
     * Get the value of a css int param
     * @param obj the jQuery object
     * @param param the css property
     * @return the value of the css property
     */
    this.getCssValue = function(obj,param) {
        var value = obj.css(param);
        if ( value.lastIndexOf('px') != -1 )
            value = value.substring(0,value.length-2);
        if ( value.length== 0 )
            return 0;
        else
            return parseInt(value);
    };
    /**
     * Extract the numerical value of a css property terminated by "px"
     * @param id the element to get the property off
     * @param param the name of the css property
     * @return its integer value
     */
    this.getCssParam = function(id,param)
    {
        var obj = jQuery("#"+id);
        return this.getCssValue(obj,param);
    };
    /**
     * Compute space of horizontal borders and padding by the toolbar
     * @return an int value
     */
    this.calcTbSlop = function()
    {
        var slop = this.getCssParam('etoolbar','border-left-width');
        slop += this.getCssParam('etoolbar','border-right-width');
        slop += this.getCssParam(this.current,'padding-left');
        slop += this.getCssParam(this.current,'padding-right');
        return slop;
    };
    /**
     * Re-calculate the page-centres after the initiation
     */
    this.recalcPageCentres = function(){
        if ( jQuery("#previewpane:hidden").length> 0 )
            this.getEditPageCentres(); 
        else
            this.getPreviewPageCentres(); 
        //console.log("recalcing page centres"); 
        //this.editbox().scrollTop(0);
        //jQuery("#imglist").css('top',"0px"); 
        this.dirty = false;
    };
    /**
     * Set widths on lhs and rhs
     */
    this.setWidths = function() {
        var wWidth = jQuery("#wrapper").width();
        var lhsWidth = Math.floor(wWidth/2);
        var rhsWidth = wWidth-lhsWidth;
        jQuery("#sides").width(wWidth);
        jQuery("#lhs").width(lhsWidth);
        jQuery("#rhs").width(rhsWidth);
    };
    /**
     * Scale the text size to fit the available space
     */
    this.fitText = function()
    {
        if ( this.fitLineLength != this.lines[this.longest] )
        {
            var eb = this.editbox();
            // set wrapper height
            var wHeight = jQuery(window).height()-jQuery("#wrapper").offset().top;
            jQuery("#wrapper").height(wHeight);
            // compute text size
            jQuery("#sides").append('<span id="measure-text">'
                +this.lines[this.longest]+'</span>');
            var font = this.editbox().css("font-family");
            jQuery("#measure-text").css("font-family",font);
            jQuery("#measure-text").css("font-size","12px");
            var maxWidth = jQuery("#measure-text").width();
            var ebWidth = eb.width();
            var tbSlop = this.calcTbSlop();
            ebWidth -= tbSlop;
            ebWidth = Math.round(ebWidth*4/5);
            var magnifiedSize = Math.floor(12*ebWidth/maxWidth);
            if ( magnifiedSize < 12 )
            {
                ebWidth = Math.round(eb.width()*19/20);
                magnifiedSize = Math.floor(12*ebWidth/maxWidth);
            }
            if ( magnifiedSize > 24 )
                magnifiedSize = 24;
            var oldSize = eb.css("font-size");
            var newSize = magnifiedSize+"px";
            jQuery("#measure-text").remove();
            eb.css("font-size",newSize);
            this.getLineHeight(this.editbox());  // NB computes this.ebSlop
            var tbHt = jQuery("#tabs").height();
            var ht = jQuery("#wrapper").height()-(this.ebSlop+tbHt);
            var nrows = Math.floor(ht/this.lineHeight);
            eb.attr("rows",nrows);
            var newEbWidth = jQuery("#rhs").width()-this.calcTbSlop();
            eb.width(newEbWidth);
            this.fitLineLength = this.lines[this.longest];
        }
    };
    /**
     * Ensure page centres on each side are increasing. Drop overlapping ones.
     */
    this.checkCentres = function()
    {
        if ( this.rCentres.length > 1 )
        {
            var lCopy = Array();
            var rCopy = Array();
            var prev = 0;
            var rLast = this.rCentres[this.rCentres.length-1];
            var lLast = this.lCentres[this.lCentres.length-1];
            for ( var i=1;i<this.rCentres.length-1;i++ )
            {
                if ( this.rCentres[i] > this.rCentres[i-1]
                    && this.lCentres[i] > this.lCentres[i-1]
                    && this.lCentres[i] < lLast
                    && this.rCentres[i] < rLast )
                {
                    rCopy.push(this.rCentres[i]);
                    lCopy.push(this.lCentres[i]);
                }
            }
            rCopy.unshift(this.rCentres[0]);
            lCopy.unshift(this.lCentres[0]);
            rCopy.push(rLast);
            lCopy.push(lLast);
            if ( rCopy.length < this.rCentres.length )
            {
                 this.lCentres = lCopy;
                 this.rCentres = rCopy;
            }
            //this.printArray( "lCentres:",this.lCentres);  
            //this.printArray( "rCentres:",this.rCentres);
        }
    };
    /**
     * Debug: print an array of ints
     * @param prompt the prompt before the array
     * @param arr the array to print
     */
    this.printArray = function( prompt, arr )
    {
        var str = prompt+" (";
        for ( var i=0;i<arr.length;i++ )
        {
            str += arr[i];
            if ( i < arr.length-1 )
                str += " ";
        }
        console.log(str+")");
    };
    /**
     * Compute the centre-points of the images
     */
    this.getImageCentres = function()
    {
        var lTops = Array();
        var imgs = jQuery("#imglist img");
        var top = 0;
        imgs.each(function(){
            var ht = parseInt(jQuery(this).attr("height"));
            top = Math.round(top);
            lTops.push(top);
            offset =0;
            top += ht;
        });
        lTops.push(top);
        this.lCentres = Array();
        for ( var i=1;i<lTops.length;i++ )
        {
            var diff = lTops[i]-lTops[i-1];
            this.lCentres.push( Math.round(lTops[i-1]+diff/2) );
        }
        this.imageEnd = lTops[lTops.length-1];
        this.imageStart = lTops[0];
        // add pseudo-page centres for start and end
        var lPanelHt = jQuery("#lhspanel").height();
        var wHalfHt = Math.round((jQuery("#wrapper").height()-lPanelHt)/2);
        this.lCentres.unshift( wHalfHt );
        this.lCentres.push( this.imageEnd - wHalfHt );
    };
    /**
     * Set the height of toolbar buttons to that of the tabs
     */
    this.setButtonHeight = function() {
        var btnHeight = jQuery("#delete-layer").height();
        var btnPadTop = this.getCssParam("delete-layer","padding-top");
        var btnPadBot = this.getCssParam("delete-layer","padding-bottom");
        var plusTabHt = jQuery("#plus-tab").height();
        var plusPadTop = this.getCssParam("plus-tab","padding-top");
        var plusPadBot = this.getCssParam("plus-tab","padding-bottom");
        if ( btnHeight+btnPadTop+btnPadBot != plusTabHt+plusPadTop+plusPadBot )
        {
            var tabHt = plusTabHt+plusPadTop+plusPadBot;
            var btnHt = btnHeight;
            var btnPadNewTop = (tabHt-btnHt)/2;
            var btnPadNewBot = (tabHt-btnHt)-btnPadNewTop;
            jQuery("#etoolbar li").css("padding-top",btnPadNewTop+"px");
            jQuery("#etoolbar li").css("padding-bottom",btnPadNewBot+"px");
        }
    };
    /**
     * Correlate the returned list of pages with those required by the text
     * @param list the list of pages returned by /pages/list
     * @return an array of page-objects corresponding to those in the text
     */
    this.filterPages = function( list ) {
        this.rTops = Array();
        this.findPages();
        this.sort(this.rTops);
        //console.log("rTops.length="+this.rTops.length);
        var found = Array();
        for ( var i=0;i<this.rTops.length;i++ )
        {
            var j;
            for ( j=0;j<list.length;j++ )
            {
                if ( this.rTops[i].name == list[j].n )
                    break;
            }
            if ( j == list.length )
            {
                var page = {};
                page.n = "blank";;
                page.src = "/corpix/blank.jpg";
                page.width = 2921;
                page.height = 3796;
                found.push(page);
            }
            else
            {
                found.push(list[j]);
            }
        }
        return found;
    };
    /**
     * Switch scrolling sides if lhs is higher than the screen and rhs is NOT 
     */
    this.checkScrolling = function() {
        var sidesHt = jQuery("#sides").height();
        if ( this.textEnd < sidesHt && this.imageEnd-this.imageStart > sidesHt )
        {
            // if not already installed, add LHS scrollframe
            if ( jQuery("#scrollframe-lhs").length==0 )
            {
                var children = jQuery("#imglist").children().detach();
                jQuery("#imglist").append('<div id="scrollframe-lhs"></div>');
                jQuery("#scrollframe-lhs").append(children);
            }
            // turn on LHS scrolling
            jQuery("#imglistcontainer").css("overflow","scroll");
        }
        else    // turn off LHS scrolling
            jQuery("#imglistcontainer").css("overflow","hidden");
    };
    /**
     * Fetch the images corresponding to the page numbers in the text
     */
    this.getPageImages = function()
    {
        var url = "http://"+window.location.hostname
            +"/pages/list?docid="+this.docid+"&version1="
            +this.version1+"/"+this.current;
        jQuery.get(url,function(data) {
            var html = "";
            self.setWidths();
            var maxW = jQuery("#lhs").width();
            var pages = self.filterPages(data);
            //console.log("length of pages ="+pages.length);
            for ( var i=0;i<pages.length;i++ )
            {
                var p = pages[i];
                var ratio = maxW/p.width;
                var w = Math.round(p.width*ratio);
                var h = Math.round(p.height*ratio);
                html += '<a class="swinxyzoom swinxyzoom-window" '
                    +'href="'+p.src+'"><img src="'
                    +p.src+'" width="'+w+'" height="'+h+'" title="'
                    +p.n+'" data-n="'+p.n+'"></a>\n';
            }
            jQuery("#imglist").empty();
            jQuery("#imglist").append(html);
            self.fitText();
            self.getImageCentres();
            jQuery("#lhs").height(jQuery("#rhs").height());
            jQuery("#imglistcontainer").height(
                jQuery("#lhs").height()-jQuery("#lhspanel").height());
            //self.fitText();
            jQuery("#"+self.target).css("visibility","visible");
            self.recalcPageCentres();
            self.setButtonHeight();
            setInterval(function(){
                if ( self.dirty == undefined || self.dirty )
                {
                    //self.printArray(self.rCentres);
                    self.recalcText();
                    self.recalcPageCentres();
                    self.checkScrolling();
                    self.dirty = false;
                    //self.printArray(self.rCentres);
                }
            },
            3000);
            // install swinxy zoom
            jQuery('a.swinxyzoom-window').swinxyzoom({mode:'window',size:'src',zoom:10});
            jQuery('.sxy-zoom-slider a').click(function(e)
            {
                e.preventDefault();
                  var
                  $this = jQuery(this);
                  // picId = parseInt($this.attr('href')),
                  // path  = '../../../_assets/images/zoom/' + $this.attr('href');
                  // jQuery('.swinxyzoom').swinxyzoom('load', path + '-small.jpg',  path + '-large.jpg');
                  jQuery('.sxy-zoom-slider a.active').removeClass('active');
                  jQuerythis.toggleClass('active');
                  jQuery('.sxy-zoom-slider .viewer').animate({ left: ($this.offset().left-jQuery('.sxy-zoom-slider').offset().left) });
            });
            self.checkScrolling();
        }).fail(function() {
            console.log( "couldn't fetch "+url );
        });
    };
    /**
     * Sort an array of ints in ascending order
     * @param a the array to sort
     */
    this.sort = function(a) {
        // shellsort
        for (var h = a.length; h = Math.floor(h/2);) {
            for (var i = h; i < a.length; i++) {
                var k = a[i];
                for (var j=i;j>=h && k.top<a[j-h].top; j-=h)
                    a[j] = a[j-h];
                a[j] = k;
            }
        }
    };
    /**
     * Identify all the page numbers in the text box
     */
    this.findPages = function() {
        this.rTops = Array();
        var current = 0;
        for ( var i=0;i<this.lines.length;i++ )
        {
            if ( this.lines[i].match("\[[0-9]+[A-Z]?\]") )
            {
                var v = {};
                var line = this.lines[i];
                Math.round(current);
                v.top = current;
                var start = line.indexOf("[");
                var end = line.indexOf("]");
                v.name = line.substr(start+1,end-1);
                this.rTops.push( v );
            }
            current += this.lineHeight;
        }
    };
    /**
     * Get the centre points of the pages in edit mode
     */
    this.getEditPageCentres = function()
    {
        this.rCentres = Array();
        this.findPages();
        var eb = this.editbox();
        var current = eb[0].scrollHeight;
        // add extra page-break at end
        if ( this.rTops.length > 0 && this.rTops[this.rTops.length-1].top < current )
        {
            var v = {};
            v.top = current;
            v.name = "final";
            this.rTops.push( v );
        }
        this.sort(this.rTops);
        for ( var i=1;i<this.rTops.length;i++ )
        {
            var diff = this.rTops[i].top-this.rTops[i-1].top;
            this.rCentres.push( Math.round(this.rTops[i-1].top+diff/2) );
        }
        this.textEnd = Math.round(this.rTops[this.rTops.length-1].top);
        // fudge first and last pages which aren't centred
        var wHalfHt = Math.round(this.editbox().height()/2);
        this.rCentres.unshift(wHalfHt);
        this.rCentres.push(this.textEnd-wHalfHt); 
        this.checkCentres();
    };
    /**
     * Check if this element contains a page no; recurse down
     * @param elem the element to test
     */
    this.testElem = function(elem){
        if ( elem.is("span") && elem.attr("class")=="page" )
        {
            var old = elem.css("display");
            elem.css("display","inline");
            // console.log(elem.position().top);
            var page = {};
            page.top = elem.position().top;
            //console.log("page.top="+page.top+" text="+elem.text());
            page.name = elem.text().trim();
            this.rTops.push(page);
            elem.css("display",old);
        }
        else
        {
            elem.children().each(function(){
                self.findPage(jQuery(this));
            });
        }
    };
    /**
     * Look for elements that might contain pages; recurse across
     * @param elem the element to look at
     */
    this.findPage = function(elem) {
        self.testElem(elem);
    };
    /**
     * Get the centre points of the pages in preview mode
     */
    this.getPreviewPageCentres = function()
    {
        this.rCentres = Array();
        this.rTops = Array();
        this.findPage(jQuery("#previewpane"));
        // add extra page-break at end
        var last = {};
        last.name = "final";
        last.top = jQuery("#previewcontents")[0].scrollHeight;
        //console.log("last="+last.top);
        this.rTops.push(last);
        this.sort(this.rTops);
        for ( var i=1;i<this.rTops.length;i++ )
        {
            var diff = this.rTops[i].top-this.rTops[i-1].top;
            this.rCentres.push( Math.round(this.rTops[i-1].top+diff/2) );
        }
        this.textEnd = Math.round(this.rTops[this.rTops.length-1].top);
        //console.log("textENd="+this.textEnd);
        // fudge first and last pages which aren't centred
        var wHalfHt = Math.round(jQuery("#previewpane").height()/2);
        this.rCentres.unshift( wHalfHt );
        this.rCentres.push( this.textEnd-wHalfHt);
        this.checkCentres();
    };
    /**
     * Get the index of the closest value in a list
     * @param list the sorted list of ints to search
     * @param value the value to look for
     * @return the biggest value in the list less than value
     */
    this.getIndex = function( list, value )
    {
        var top = 0;
        var bot = list.length-1;
        var mid=0;
        while ( top <= bot )
        {
            mid = Math.floor((top+bot)/2); // NB integer arithmetic
            if ( value < list[mid] )
            {
                if ( mid == 0 )
                {
                    // value < than first item
                    return -1;  
                }
                else
                    bot = mid-1;
            }
            else    // value >= list[mid]
            {
                if ( mid == list.length-1 )
                {
                    // value is >= last item
                    break;
                }
                else if ( value >= list[mid+1] )
                    top = mid+1;
                else // list[mid] must be biggest <= value
                    break;
            }
        }
        return mid;
    };
    /**
     * Get the interpolated LHS scroll position corresponding to the RHS
     * @param rVal the RHS value
     * @return the corresponding lValue
     */
    this.interpolate = function( rVal )
    {
        if ( this.rCentres != undefined )
        {
            var index = this.getIndex( this.rCentres, rVal );
            if ( index < this.rCentres.length )
            {
                var prev = this.rCentres[index];
                var next = this.rCentres[index+1];
                var fromPrev = (rVal-prev)/(next-prev);
                var lPrev = this.lCentres[index];
                var lNext = this.lCentres[index+1];
                return Math.round(lPrev+(lNext-lPrev)*fromPrev);
            }
            else
                return this.lCentres[this.lCentres.length-1];
        }
    };
    /**
     * Get the value of the tab
     * @param text the text content of the tab
     * @return its unmeric value
     */
    this.tabValue = function(text) {
        var parts = text.split("-");
        if ( parts[parts.length-1] == "final" )
            return Number.MAX_VALUE;
        return parseInt(parts[parts.length-1]);
    };
    /**
     * Get the id previous to the one given
     * @param id the current id
     * @return the id that should precede this
     */
    this.prevId = function( id ) {
        if ( id == "layer-final" )
            return "layer-1";
        else
            return id;
    };
    /**
     * Get the id previous to the one given
     * @param id the current id
     * @return the id that should precede this
     */
    this.nextId = function( id ) {
        if ( id == "layer-final" )
            return id;
        else
        {
            var value = this.tabValue(id);
            return "layer-"+(value+1);
        }
    };
    /**
     * Get the next tab-value
     * @param the tabe name to increment
     * @return the next tab
     */
    this.incrementTabLabel = function( label ){
        if ( label.indexOf("layer-")==0 && label.indexOf("final")==-1)
        {
            var value = this.tabValue(label);
            return "layer-"+(value+1);
        }
        else
            return label;
    };
    /**
     * Get the next tab-value
     * @param the tabe name to increment
     * @return the next tab
     */
    this.decrementTabLabel = function( label ){
        if ( label.indexOf("layer-")==0 && label.indexOf("final")==-1)
        {
            var value = this.tabValue(label);
            return "layer-"+(value-1);
        }
        else
            return label;
    };
    /**
     * Add a reactivation handler to the active tab just before it deactivates
     */
    this.addClickToActiveTab = function() {
        jQuery(".active-tab").click(function(){
            jQuery(this).unbind("click");
            self.addClickToActiveTab();
            jQuery(".active-tab").attr("class","inactive-tab");
            jQuery(this).attr("class","active-tab");
            self.switchLayer(jQuery(this).text());
        });
    };
    /**
     * Switch tabs to the one named
     * @param the text label of the tab
     */
    this.switchLayer = function( tab ) {
        this.current = tab;
        jQuery(".editbox-active").attr("class","editbox-inactive");
        this.editbox().attr("class","editbox-active");
        // recompute the text
        this.recalcText();
        this.fitLineLength = 0;
        this.fitText();
        this.recalcPageCentres();
        this.editbox().scrollTop(0);
        jQuery("#imglist").css('top',"0px");
        this.addEditboxHandlers();
    };
    /**
     * Subtract the current active layer
     */
    this.subtractLayer = function() {
        if ( confirm("Are you sure? all data in "+this.current+" will be lost.") )
        {
            if ( this.current == "layer-final" )
                alert("You can't remove the final layer!");
            else
            {
                // delete textarea and tabs & adjust ids, labels
                this.editbox().remove();
                var delendum = undefined;
                var currValue = this.tabValue(this.current);
                jQuery("#tabs td").each(function(){
                    var text = jQuery(this).text().trim();
                    if ( text == self.current )
                        delendum = jQuery(this);
                    else if ( text != "+" && self.tabValue(text) > currValue )
                        jQuery(this).text(self.decrementTabLabel(text));
                });
                if ( delendum != undefined )
                    delendum.remove();
                jQuery("textarea").each(function(){
                    var id = jQuery(this).attr("id");
                    if ( self.tabValue(id) > self.tabValue(self.current) )
                        jQuery(this).attr("id",self.decrementTabLabel(id));
                });
                // now set current and activate its textarea
                var currId = this.tabValue(this.current);
                var nextId = "layer-"+(currValue+1);
                if ( jQuery("#"+nextId).length==1 )
                    this.current = nextId;    
                else
                    this.current = "layer-final";
                this.editbox().attr("class","editbox-active");
                // find the next tab value and make it active too
                jQuery("#tabs td").each(function(){
                    var text = jQuery(this).text().trim();
                    if ( text == self.current )
                        jQuery(this).attr("class","active-tab");
                    else if ( text.indexOf("layer") != -1 )
                        jQuery(this).attr("class","inactive-tab");  
                });
                // recompute the page centres and reset 
                this.fitText();
                this.recalcPageCentres();
            }
        }
    };
    /**
     * Remove the current selection and save it in the undo buffer
     */  
    this.deleteSelection = function(){
        var eb = this.editbox();
        var sel = eb.getSelection();
        var cutText = eb.val().substring(sel.start,sel.end);
        eb.deleteSelectedText();
        // save for later undo
        var act = {};
        act.loc = sel.start;
        act.text = cutText;
        act.type = 1;   // cut, delete range
        this.undoBuffer.push( act );
    };
    /**
     * Insert some text at the selection point and save in undo buffer
     */  
    this.insertAtSelection = function(text){
        var eb = this.editbox();
        var sel = eb.getSelection();
        eb.insertText(text,sel.start);
        // save for later undo
        var act = {};
        act.loc = sel.start;
        act.text = text;
        act.type = 2;   // paste, insert text
        this.undoBuffer.push(act);
    };
    /**
     * Check if there is a selection, and delete it
     * @return true if there was a selection to delete
     */
    this.checkDeleteSelection = function(){
        var sel = this.editbox().getSelection();
        if ( sel.start != sel.end )
        {
            this.annotator.deleteSelection(sel.start,sel.end);
            this.deleteSelection();
            return true;
        }
        else
            return false;
    };
    /**
     * Stop accumulating characters in the undo buffer
    */
    this.changeContext = function(e) {
        if ( self.undoBuffer.length > 0 )
        {
            var act = self.undoBuffer[self.undoBuffer.length-1];
            if ( act.type >= 3 && act.type <= 5 )
                act.sent = true;
        }
    };
    /**
     * Add handlers to the current editbox; remove any already present
     */
    this.addEditboxHandlers = function() {
        var eb = this.editbox();
        eb.off("scroll");
        eb.off("keydown");
        eb.off("paste");
        eb.off("cut");
        eb.off("click");
        eb.off("blur");
        eb.scroll(function(e){
            var eb = jQuery(e.target);
            var top = eb.scrollTop();
            var bot = top+self.editbox().height();
            var lCentre = self.interpolate( Math.round((top+bot)/2) );
            var lPanelHt = jQuery("#lhspanel").height();
            lCentre -= (jQuery("#wrapper").height()-lPanelHt)/2;
            jQuery("#imglist").css('top',-Math.round(lCentre)+"px");
        });
        /**
         * User clicked in textarea
         */
        eb.click(function(e){
            self.changeContext();
        });
        /**
         * The user clicked elsewhere
         */
        eb.blur(function(){
            self.changeContext();
        });
        /**
         * Need separate handlers for paste, cut
         */
        eb.bind('paste', function(e) {
            var cbData = e.originalEvent.clipboardData || window.clipboardData;
            var data = cbData.getData('Text');
            self.checkDeleteSelection();
            var sel = jQuery(this).getSelection();
            self.annotator.addRange(sel.start,data.length);
            console.log("pasting data length="+data.length);
            self.insertAtSelection(data);
            e.stopPropagation();
            e.preventDefault();
        });
        eb.bind('cut', function(e) {
            self.checkDeleteSelection();
             e.stopPropagation();
             e.preventDefault();
        });
        /**
         * Handle all other keyboard events - self.forbidden may need updating
         */
        eb.keydown(function(e){
            var eb = jQuery(this);
            if ( e.ctrlKey || e.metaKey )
            {
                if ( e.keyCode == 90 )  // undo/redo
                {
                    // override browser's idiosyncratic undo/redo handling
                    e.stopPropagation();
                    e.preventDefault();
                    if ( e.shiftKey && self.redoBuffer.length > 0 )   // redo
                    {
                        var act = self.redoBuffer.pop();
                        switch ( act.type )
                        {
                            case 1:
                                eb.setSelection(act.loc,act.loc+act.text.length);
                                eb.deleteSelectedText();
                                self.annotator.deleteSelection(act.loc,act.loc+act.text.length);
                                self.undoBuffer.push(act);
                                break;
                            case 2:
                                eb.insertText(act.text, act.loc);
                                self.annotator.addRange(act.loc,act.text.length);
                                self.undoBuffer.push(act);
                                break;
                        }
                    }
                    else if ( self.undoBuffer.length > 0 )  // undo
                    {
                        var act = self.undoBuffer.pop();
                        switch ( act.type )
                        {
                            case 1: case 5: case 4:// cut, backspace, delete
                                eb.setSelection(act.loc,act.loc);
                                eb.insertText(act.text, act.loc, "collapseToEnd" );
                                self.annotator.addRange(act.loc,act.text.length);
                                self.redoBuffer.push(act);
                                break;
                            case 2: case 3:// paste, typedchars
                                eb.setSelection(act.loc,act.loc+act.text.length);
                                eb.deleteSelectedText();
                                self.annotator.deleteSelection(act.loc,act.loc+act.text.length);
                                self.redoBuffer.push(act);
                                break;
                        }
                    }
                }
            }
            else if ( e.keyCode == 8 )  // backspace
            {
                var sel = eb.getSelection();
                if ( !self.checkDeleteSelection() && sel.start > 0 )
                {
                    var act = null;
                    var text = eb.val().substring(sel.start-1,sel.start);
                    if ( self.undoBuffer.length > 0 )
                        act = self.undoBuffer[self.undoBuffer.length-1];
                    if ( act == null || act.type != 5 || act.sent )
                    {
                        act = {};
                        act.type = 5;   // backwards delete
                        act.text = text;
                        act.loc = sel.start-1;
                        self.undoBuffer.push(act);
                    }
                    else 
                    {
                        act.loc = sel.start-1;
                        act.text = text + act.text;
                    }
                    self.annotator.doBackspace(sel.start);
                }
            }
            else if ( e.keyCode == 46 ) // delete
            {
                var sel = eb.getSelection();
                var text = eb.val();
                if ( !self.checkDeleteSelection() && sel.start < text.length )
                {
                    var act = null;
                    var data = text.substring(sel.start,sel.start+1);
                    if ( self.undoBuffer.length > 0 )
                        act = self.undoBuffer[self.undoBuffer.length-1];
                    if ( act == null || act.type != 4 || act.sent )
                    {
                        act = {};
                        act.type = 4;   // forward delete
                        act.text = data;
                        act.loc = sel.start;
                        self.undoBuffer.push(act);
                    }
                    else 
                        act.text += data;
                    self.annotator.doDelete(sel.start);
                }
            }
            else if ( e.keyCode != undefined && self.forbidden[e.keyCode]== undefined )
            {
                var sel = eb.getSelection();
                self.checkDeleteSelection();
                var act = null;
                if ( self.undoBuffer.length > 0 )
                    act = self.undoBuffer[self.undoBuffer.length-1];
                if ( act == null || act.type != 3 || act.sent )
                {
                    act = {};
                    act.type = 3;   // character data
                    act.text = String.fromCharCode(e.keyCode);
                    act.loc = sel.start;
                    self.undoBuffer.push(act);
                }
                else 
                    act.text += String.fromCharCode(e.keyCode);
                self.annotator.keyTyped(sel.start);
            }
            else // ignore
                console.log(e.keyCode+":"+e.key);
            self.saved = false;
            self.dirty = true;
        });
    };
    /**
     * Add a new layer by copying the first layer
     */
    this.newLayer = function() {
        // add click-handler to previous tab
        this.addClickToActiveTab();
        var contents = this.editbox().val();
        this.saved = true;
        // increment existing layers
        jQuery("textarea").each(function(){
            var id = jQuery(this).attr("id");
            var nextId = self.nextId(id);
            jQuery(this).attr("id",nextId);
        });
        var html = '<textarea class="editbox-active" id="layer-1"></textarea>';
        jQuery("#tabs").after(html);
        this.current = "layer-1";
        jQuery("#layer-1").val(contents);
        jQuery(".editbox-active").attr("class","editbox-inactive");
        this.editbox().attr("class","editbox-active");
        // add new tab and make it active also
        jQuery("#tabs td").each(function(){
            var text = jQuery(this).text();
            jQuery(this).text(self.incrementTabLabel(text));
        });
        html = '<td class="active-tab">layer-1</td>';
        jQuery(".active-tab").attr("class","inactive-tab");
        jQuery("#plus-tab").after(html);
        this.fitLineLength = 0;
        self.fitText();
        self.recalcPageCentres();
        self.addEditboxHandlers();
    };
    /**
     * Remove all objects defined by a particular selector
     * @param selector the selector the choose objects
     * @param exception except this one
     * @param byid if supplied select by id
     */
    this.removeObjects = function(selector,exception,byid) {
        var delenda = Array();
        jQuery(selector).each(function(){
            var value;
            if ( byid )
                value = jQuery(this).attr("id");
            else
                value = jQuery(this).text();
            if ( value != exception )
                delenda.push(jQuery(this));
        });
        for ( var i=0;i<delenda.length;i++ )
            delenda[i].remove();
    };
    /**
     * Make sure the edit option button is hidden
     */
    this.hideEditOption = function() {
        var eBox = jQuery("#editoption");
        if ( eBox.css("visibility") == "visible" )
            eBox.css("visibility","hidden");
    };
    /**
     * Handle right-mouse clicks for version menu options
     */
    this.editOptionHandler = function(e) {
        if ( e.which == 3 )
        {
            e.preventDefault();
            var li = jQuery(e.target);
            var eBox = jQuery("#editoption");
            eBox.css("visibility","visible");
            eBox.width(jQuery("#editoption span").width());
            eBox.height(li.height());
            var pos = jQuery(e.target).offset();
            var lpos = pos.left+jQuery(e.target).outerWidth(true);
            eBox.offset({left:lpos,top:pos.top});
            eBox.mouseup(function(){
                e.preventDefault();
                var liText = li.text();
                var parent = li.parent();
                li.replaceWith('<input type="text" id="templongname" value="'
                    +liText+'"><input type="button" value="OK" id="tempok">');
                var liField = parent.children('input[type="text"]');
                liField.click(function(e){
                    e.preventDefault();
                    return false;
                });
                var okButton = jQuery("#tempok");
                okButton.click(function(e){
                    var li = jQuery(this).parent();
                    var longName = jQuery("#templongname").val();
                    li.empty();
                    li.append('<a href="#">'+longName+'</a>');
                    self.versionMenu.resizeForOption(longName);
                    e.preventDefault();
                    self.saved = false;
                    self.hideEditOption();
                });
                eBox.css("visibility","hidden");
            });
            return false;
        }
    };
    /**
     * Save the version to the server scratch database
     * @param onsave call this function on successful save
     */
    this.save = function(onsave){
        if ( !this.saved )
        {
            var url = "http://"+window.location.hostname+"/mml/dialect?docid="+this.docid;
            jQuery.get(url,function(data){
                var formatter = new Formatter(data);
                var packet = {};
                packet.layers = [];
                packet.docid = self.docid;
                packet.longname = self.versionMenu.getLongName(self.version1);
                packet.version1 = self.version1;
                //console.log("saving "+packet.version1+" with "+packet.longname);
                jQuery("textarea").each(function(){
                    var text = jQuery(this).val();
                    var html = formatter.toHTML(text);
                    var layer = {};
                    layer.name = jQuery(this).attr("id");
                    layer.body = html;
                    packet.layers.push(layer);
                });
                var obj = {};
                obj.data = JSON.stringify(packet);
                console.log("posting to /mml/version");
                jQuery.post("http://"+window.location.hostname+"/mml/version",
                    obj, function(data){
                        console.log("posted to mml/version");
                        if ( data == "OK" )
                        {
                            if ( onsave != undefined )
                                onsave();
                            self.saved = true;
                        }
                        else
                        {
                            alert("save failed! (message: "+data+")");
                        }
                     }).fail(function(){
                         console.log("save failed");
                     });
            }).fail(function() {
                console.log( "couldn't fetch "+url );
            });
        }
        // save annotations too
        this.annotator.save();
    };
    /**
     * Encode a string as hex
     * @param str the string to encode
     * @return a hex string representing str
     */
    this.encodeHex = function(str){
        var hex = "";
        for ( var i=0;i<str.length;i++ )
        {
            var hc = str.charCodeAt(i).toString(16);
            for ( var j=hc.length;j<4;j++ )
                hex += '0';
            hex += hc;
        }
        return hex;
    };
    /**
     * Decode a hex string back to its literal representation
     * @param hex the hex string
     * @return a valid text string the hex represented
     */
    this.decodeHex = function( hex ) {
        var str = "";
        for ( var i=0;i<hex.length;i+=4 )
        {
            var chunk = hex.slice(i,i+4);
            var cc = parseInt(chunk,16);
            str += String.fromCharCode(cc);
        }
        return str;
    };
    /**
     * Populate a formatting menu with values from the dialect
     * @param id the id of the select menu
     * @param arr thje array of formats from the dialect
     */
    this.populateMenu = function(id,arr) {
        var menu = jQuery("#"+id);
        menu.empty();
        // first option is select - will default to this
        menu.append('<option value="choose">--Choose--</option>');
        // select this to remove current format
        menu.append('<option value="remove">--Remove--</option>');
        if ( arr != undefined )
        {
            if ( arr.length==0 )
                menu.parent().remove();
            else
            {
                for ( var i=0;i<arr.length;i++ )
                {
                    var fmt = arr[i];
                    if ( "prop" in fmt && fmt.prop.length>0 )
                    {
                        var json = JSON.stringify(fmt);
                        var cleaned = this.encodeHex(json);
                        menu.append('<option value="'+cleaned+'">'+fmt.prop+'</option>');
                    }
                }
            }
        }
    };
    /**
     * Read the dialect and populate the formatting menus
     */
    this.readDialect = function() {
        var url = "http://"+window.location.hostname+"/mml/dialect?docid="+this.docid;
        jQuery.get(url,function(dialect){
            self.populateMenu("charformats",dialect.charformats);
            self.populateMenu("lineformats",dialect.lineformats);
            self.populateMenu("paraformats",dialect.paraformats);
            self.populateMenu("sectionformats",dialect.sections);
            self.dialect = dialect;
        });
    };
    /**
     * Fetch the text from the server via its docid
     */
    this.getVersionText = function()
    {
        var url = "http://"+window.location.hostname+"/mml/mml?docid="+this.docid;
        if ( this.version1 != null )
            url += "&version1="+this.version1;
        jQuery.get(url,function(data) {
            var html = '<table><tr><td class="empty-tab">empty</td>';
            html += '<td id="plus-tab">+</td>';
            // clear pre-existing layers
            jQuery("#rhs textarea").remove();
            for ( var i=0;i<data.layers.length;i++ )
            {
                jQuery("#rhs").append('<textarea class="editbox-inactive" id="layer-'
                    +data.layers[i].name+'"></textarea>');
                var ta = jQuery("#layer-"+data.layers[i].name);
                ta.val(data.layers[i].body);
                //console.log("Setting text area to:"+data.layers[i].body);
                var tabName = data.layers[i].name=="final"
                    ?"layer-final":"layer-"+data.layers[i].name;
                html += '<td class="inactive-tab">'+tabName+'</td>';
            }
            html += '</tr></table>';
            jQuery("#rhs").append('<div id="previewpane" style="display:none">'
            +'<div id="previewcontents"></div></div>');
            var tabs = jQuery("#tabs");
            // destroy existing tabs
            tabs.empty();
            jQuery("#tabs").append(html);
            jQuery("#tabs td").last().removeClass("inactive-tab");
            jQuery("#tabs td").last().addClass("active-tab");
            self.current = "layer-final";
            jQuery("#layer-final").attr("class","editbox-active");
            jQuery(".inactive-tab").click(function(){
                jQuery(this).unbind("click");
                self.addClickToActiveTab();
                jQuery(".active-tab").attr("class","inactive-tab");
                jQuery(this).attr("class","active-tab");
                self.switchLayer(jQuery(this).text());
            });
            self.recalcText();
            self.getPageImages();
            self.addEditboxHandlers();
            jQuery("#plus-tab").click(function(){
                self.newLayer();
            });
            self.readDialect();
            self.getStylesheet(self.docid);
            // check that the text fits in the box as it is being edited
            window.setInterval( function(){ self.fitText() }, 10000);
        }).fail(function() {
            console.log( "couldn't fetch "+url );
        });
    };
    /**
     * Handle the selection of a new version
     */
    this.versionSelector = function() {
        var current = self.versionMenu.getValue();
        var onsave = function(){
            self.version1 = self.versionMenu.getValue();
            console.log("setting version1 to "+self.version1);
            self.clearTabs();
            //console.log("cleared tabs");
            self.getVersionText();
        };
        if ( current == "new-version" )
        {
            jQuery("#newversion").css("visibility","visible");
        }
        else if ( self.version1 != current )
        {
            if ( !self.saved )
            {
                self.save(onsave);
            }
            else
            {
                onsave();
        }
    }
    // can have been selected and not dismissed
    self.hideEditOption();
    };
    /**
     * Fill out the version menu
     * @param docid the docid whose versions are needed
     */
    this.getVersions = function(docid) {
        var url = "http://"+window.location.hostname+"/mml/versions?docid="+docid;
        jQuery.get(url,function(data){
            self.versions = data;
            self.versionMenu = new DropDown('versions','Version: ',
                self.versionSelector, self.hideEditOption);
            for ( var i=0;i<data.length;i++ )
            {
                var jObj = data[i];
                self.versionMenu.addOption(jObj.vid,jObj.desc,self.editOptionHandler);
            }
            self.versionMenu.addOption("new-version","New version...",null);
            var version;
            if ( self.version1 != undefined && self.version1.length>0 )
                self.version1 = data[0].vid;
            self.getVersionText();
        }).fail(function() {
            console.log( "couldn't fetch "+url );
        });
    };
    /**
     * Remove tabs and associated textareas. Leave "layer-final"
     * Version should be saved first!
     */
    this.clearTabs = function() {
        self.switchLayer("layer-final");
        jQuery(".inactive-tab").remove();
        jQuery(".editbox-inactive").remove();
    };
    /**
     * Replace a http url parameter
     * @param url the original url
     * @param key the parameter key
     * @param value the new parameter value
     * @return the new url
     */
    this.replaceUrlParam = function(url,key,value) {
        var qPos = url.indexOf("?");
        var newUrl = "";
        if ( qPos != -1 )
        {
            var rest = url.substring(qPos+1);
            var parts = rest.split("&");
            newUrl = url.substring(0,qPos+1);
            for ( var i=0;i<parts.length;i++ )
            {
                var halves = parts[i].split("=");
                var prec = (i==0)?"":"&";
                if ( halves.length==2 )
                {
                    if ( halves[0] == key )
                    {
                        newUrl += prec+key+"="+value;
                        continue;
                    }
                }
                newUrl += prec+parts[i];
            }
        }
        console.log(newUrl);
        return newUrl;
    };
    /**
     * Build an open or new dialog with a list of choosable docids
     * @param dialog the base portion of the dialog id
     * @param okFunction the functionto call when OK is clicked
     */
    this.buildChooseDialog = function(dialogid,okFunction) {
        jQuery("#"+dialogid+" div").append(
        '<select id="'+dialogid+'-select"><option value="select-option">Select...</option></select>'
        +'<div class="buttons">'
        +'<input type="button" id="'+dialogid+'-cancel" value="Cancel"></input>'
        +'<input type="button" id="'+dialogid+'-ok" value="OK"></input></div>');
        jQuery("#"+dialogid).css("padding-top",
            Math.round(jQuery(window).height()/4)+"px");
        jQuery("#"+dialogid+"-cancel").click(function(){
            jQuery("#"+dialogid).css("visibility","hidden");
        });
        jQuery("#"+dialogid+"-ok").click(okFunction);
        jQuery("#"+dialogid+"-select").change(function(){
            var info = jQuery("#"+dialogid+"-fileinfo");
            if ( info.length == 0 )
            {
                jQuery("#"+dialogid+"-select").after('<div id="'+dialogid+'-fileinfo"></div>');
                info = jQuery("#"+dialogid+"-fileinfo");
            }
            info.empty();
            var value = jQuery("#"+dialogid+"-select").val();
            var url2 = "http://"+window.location.hostname+"/mml/metadata?docid="+value;
            jQuery.get(url2,function(data) {
                info.append('<p class="title">'+data.title+'</p>');
            });
        });
    };
    /**
     * Build a list of docids from a service within project
     * @param service the name of the project service
     * @param dialogid the leading id component of the dialog element id
     */
    this.buildDocidList = function(service,dialogid) {
        var url = "http://"+window.location.hostname
            +"/project/projid?docid="+self.docid;
        jQuery.get(url,function(pdata){
            if ( "projid" in pdata )
            {
                var url = "http://"+window.location.hostname
                    +"/project/"+service+"?projid="+pdata.projid
                    // ignored if not needed
                    +"&withimages=true";
                jQuery.get(url,function(data) {
                    var docs = data.documents;
                    if ( docs != undefined )
                    {
                        var options ="";
                        var select = jQuery("#"+dialogid+"-select");
                        for ( var i=0;i<docs.length;i++ )
                        {
                            var docId;
                            if ( typeof docs[i] == "string" )
                                docId = docs[i]; 
                            else
                                docId = docs[i].docid;                           
                            var pos = docId.indexOf(pdata.projid);
                            if ( pos == 0 )
                            {
                                var tail = docId.substring(pdata.projid.length+1);
                                options += '<option value="'+docId+'">'
                                    +tail+'</option>';
                            }
                        }
                        select.append(options);
                        var sWidth = select.width();
                        var dWidth = jQuery("#"+dialogid+" div").width();
                        //console.log("sWidth="+sWidth+" dWidth="+dWidth);
                        if ( dWidth < sWidth+sWidth/5 )
                        {
                            dWidth = sWidth+sWidth/5;
                            jQuery("#"+dialogid+" div").width(dWidth);
                        }
                    }
                    // disable docid in opendialog-select
                    if ( service=="documents")
                        self.setDocidAndVersion(self.docid,self.version1);
                });
            }
            else
                console.log("project did not return valid projid");
        }).fail(function(){
            console.log("failed to get project id");
        });
    };
    /**
     * Does the value contain something
     * @param value
     * @return true if it is not empty
     */
    this.isValid = function(value) {
        return value != undefined && value != null && value.length > 0;
    };
    /**
     * Build a list of new versions using the mml service
     * @param dialogid the leading id component of the dialog element id
     */
    this.buildNewVersionList = function(dialogid) {
        if ( this.isValid(this.docid) )
        {
            var url = "http://"+window.location.hostname
                +"/mml/newversions?docid="+self.docid;
            jQuery.get(url,function(data){
                var select = jQuery("#"+dialogid+"-select");
                var options ="";
                for ( var i=0;i<data.length;i++ )
                {
                    var version = data[i];
                    options += '<option value="'+version.vid+'">'
                            +version.desc+'</option>';
                }
                select.append(options);
                var sWidth = select.width();
                var dWidth = jQuery("#"+dialogid+" div").width();
                if ( dWidth < sWidth+sWidth/5 )
                {
                    dWidth = sWidth+sWidth/5;
                    jQuery("#"+dialogid+" div").width(dWidth);
                }
                //console.log("loaded new versions");
            });
        }
    };
    /**
     * Set the docid and the version when it changes
     */
    this.setDocidAndVersion = function( docid, version ){
        if ( self.docid != undefined )
        {
            var curr = jQuery('#opendialog-select option:disabled');
            curr.prop("disabled",false);
        }
        self.docid = docid;
        self.version1 = version;
        var selector = '#opendialog-select option[value="'+docid+'"]';
        var opt = jQuery(selector);
        if ( opt.length == 1 )
            opt.prop("disabled",true);
    };
    /**
     * Load an existing document
     */
    this.loadExistingDocument = function(){
        var value = jQuery("#opendialog-select").val();
        // use self not this because we are a handler not a method
        if ( value != "select-option" && value != self.docid )
        {
            self.setDocidAndVersion(value,null);
            var newUrl = self.replaceUrlParam(window.location.href,"docid",self.docid);
            window.location.assign(newUrl);
        }
        jQuery("#opendialog").css("visibility","hidden");
    };
    /** 
     * Create a blank document with page references
     * @param pages a list of pages
     * @return the text of the blank pages
     */
    this.makeBlankDocWithPages = function(pages) {
        var text = "";
        var url = "http://"+window.location.hostname+"/mml/dialect?docid="+this.docid;
        jQuery.get(url,function(data){
            var lineFmts = data.lineformats;
            for ( var i=0;i<lineFmts.length;i++ )
            {
                if ( lineFmts[i].prop == "page" )
                {
                    leftTag = lineFmts[i].leftTag;
                    rightTag = lineFmts[i].rightTag;
                }
            }
            for ( var i=0;i<pages.length;i++ )
            {
                text += leftTag+pages[i].n+rightTag+"\n";
                if ( i < pages.length )
                    text += "\n\n\n\n\n\n\n\n\n";
            }
            // create empty textarea layer-final
            self.clearTabs();
            // fill edit box with empty text plus page-refs
            self.editbox().val(text);
            // fetch corresponding images
            self.recalcText();
            self.getPageImages();
            //self.addEditboxHandlers();
            var newUrl = self.replaceUrlParam(window.location.href,"docid",self.docid);
            var state = {foo:"bar"};
            history.pushState(state,"",newUrl);
            self.readDialect(); // sets up menus 
            self.getStylesheet(self.docid);
        }).fail(function(){
            console.log("no dialect for "+self.docid);
        });
    };
    /**
     * Remove the layer- designation from the version name
     * @param version a version possibly with a layer name at the end
     * @return the bare version name
     */
    this.stripLayer = function( version ) {
        var index = version.lastIndexOf("/layer-");
        if ( index != -1 )
            return version.substring(0,index);
        else
            return version;
    };
    /**
     * Create an empty version of a new document
     * @param pages the pages list returned from the server
     */
    this.createVersionCopy = function(pages) {
        var select = jQuery("#newversion-select");
        var value = select.val();
        if ( value != "select-option" )
            self.version1 = value;
        self.versionMenu.cancelNewVersion();
        self.versionMenu.beforeLast(value,"Version "+value,self.editOptionHandler);
        self.versionMenu.selectByVal(value);
        var url = "http://"+window.location.hostname+"/mml/dialect?docid="+this.docid;
        jQuery.get(url,function(data){
            var lineFmts = data.lineformats;
            for ( var i=0;i<lineFmts.length;i++ )
            {
                if ( lineFmts[i].prop == "page" )
                {
                    leftTag = lineFmts[i].leftTag;
                    rightTag = lineFmts[i].rightTag;
                }
            }
            var currText = self.editbox().val();
            var copyText = "";
            var lines = currText.split("\n");
            var j = 0;
            for( var i=0;i<lines.length;i++ )
            {
                var line = lines[i].trim();
                if ( line.indexOf(leftTag)==0 
                    && line.lastIndexOf(rightTag) == line.length-rightTag.length)
                {
                    if ( j < pages.length )
                    {
                        copyText += leftTag + pages[j].n+rightTag+"\n";
                        j++;
                    }
                }
                else
                    copyText += lines[i]+"\n";
            }
            for ( var i=j;i<pages.length;i++ )
            {
                copyText += leftTag+pages[i].n+rightTag+"\n";
                if ( i < pages.length )
                    copyText += "\n\n\n\n\n\n\n\n\n";
            }
            // create empty textarea layer-final
            self.clearTabs();
            // fill edit box with copied text plus new page-refs
            self.editbox().val(copyText);
            self.save();
            // fetch corresponding images
            self.recalcText();
            self.getPageImages();
            //self.addEditboxHandlers();
        }).fail(function(){
            console.log("no dialect for "+self.docid);
        });
    };
    /**
     * Create an empty version of a new document
     */
    this.createEmptyDocument = function() {
        var select = jQuery("#newdialog-select");
        var value = select.val();
        if ( self.currentMode == "preview" || !jQuery("#preview").is(":visible") )
        {
            jQuery("#previewpane").hide();
            self.currentMode = "edit";
            jQuery("#preview").show();
            self.editbox().show();
        }
        if ( value != "select-option" )
        {
            var url = "http://"+window.location.hostname+"/mml/version1?docid="+value;
            jQuery.get(url,function(data){
                if ( data.length > 0 )
                {
                    data = self.stripLayer(data);
                    self.versionMenu = new DropDown('versions','Version: ',self.versionSelector);
                    self.versionMenu.addOption(data,"Version "+data,self.editOptionHandler);
                    self.versionMenu.addOption("new-version","New version...",null);            
                    self.setDocidAndVersion( value, data );
                    // disable that document in new menu
                    var selector = '#newdialog-select option[value="'+self.docid+'"]';
                    var opt = jQuery(selector);
                    if ( opt.length == 1 )
                        opt.prop("disabled",true);
                    var url2 = "http://"+window.location.hostname+"/pages/list?docid="
                        +self.docid+"&version1="+data;
                    jQuery.get(url2,function(data){
                        self.makeBlankDocWithPages(data);
                    });
                }
                else
                    console.log("no version1 found for "+self.docid);
            });
            
        }
        jQuery("#newdialog").css("visibility","hidden");
    };
    /**
     * Create a new version of an existing document
     */
    this.createNewVersion = function() {
        var onsave = function() {
            self.clearTabs();
        var select = jQuery("#newversion-select");
        var value = select.val();
        var url = "http://"+window.location.hostname+"/pages/list?docid="
                +self.docid+"&version1="+value;
            jQuery.get(url,function(data){
                self.createVersionCopy(data);
            });
        };
        // yes self, not this
        if ( !self.saved )
            self.save(onsave);
        else
            onsave();
        jQuery("#newversion").css("visibility","hidden");
    };
    /**
     * Build the new version dialog
     */
    this.buildOpenDialog = function() {
        this.buildChooseDialog("opendialog",this.loadExistingDocument);
        this.buildDocidList("documents","opendialog");
    };
    /**
     * Build the new document dialog
     */
    this.buildNewDialog = function() {
        this.buildChooseDialog("newdialog",this.createEmptyDocument);
        this.buildDocidList("newdocs","newdialog");
    };
    /**
     * Build the new version dialog 
     */
    this.buildNewVersionDialog = function() {
        this.buildChooseDialog("newversion",this.createNewVersion);
        this.buildNewVersionList("newversion");
    };
    /**
     * Append the document's stylesheet to the header
     */
    this.getStylesheet = function(docid){
        var url = "http://"+window.location.hostname+"/mml/corform?docid="+docid;
        jQuery.get(url,function(data){
            jQuery("#mmlstyle").remove();   // remove old one if present
            jQuery("head").append('<style id="mmlstyle" type="text/css">'+data+'</style>');
            self.annotator.load(this.docid);
        }).fail(function() {
            console.log( "couldn't fetch "+url );
        });
    };
    /**
     * Clear any menus that are still lying around
     * @param id the id of the menu to clear
     */
    this.clearMenu = function(id){
        var cmenu = jQuery("#"+id);
        if ( cmenu.css("display")=="block" )
            cmenu.css("display","none");
    };
    /**
     * Clear all menus
     */
    this.clearMenus = function(){
        this.clearMenu("charformats");
        this.clearMenu("paraformats");
        this.clearMenu("lineformats");
    };
    /**
     * Examine a text token to see if it marks a boundary of a paragraph or section
     * @param token the token to examine
     * @param state the start state
     * @return 1 if boundary was a line, 2=para or 3=section
     */
    this.examineBoundary = function( token, state ) {
        switch ( state )
        {
            case 0: // looking for first '\n'
                if ( token == '\n' )
                    state = 1;
                else if ( token != '\t' && token != ' ' )
                    state = 0;
                break;
            case 1: // seen '\n'
                if ( token == '\n' )
                    state = 2;
                else if ( token != '\t' && token != ' ' )
                    state = 0;
                break;
            case 2: // seen \n\n
                if ( token == '\n' )
                    state = 3;
                else if ( token != '\t' && token != ' ' )
                    state = 0;
                break;
        }
        return state;
    };
    /**
     * Is the current position the edge of a boundary?
     * @param text the text to look in
     * @param pos the position to test
     * @param target the target state to reach
     * @param backwards true if we look backwards, else forwards
     * @return true if it was a boundary to the left or right
     */
    this.isBoundary = function(text,pos,target,backwards) {
        var limit = text.length-1;
        var state = 0;
        if ( backwards )
        {
            do
            {
                pos--;  // we need pos to reduce to -1
                if ( pos >= 0 )
                {
                    var token = text[pos];
                    state = this.examineBoundary(token,state,limit,true);
                }
            }
            while ( pos >= 0 && state < target && state != 0 );
            return (state <= target && state > 0) || pos == -1;
        }
        else
        {
            do
            {
                var token = text[pos++];
                state = this.examineBoundary(token,state,limit,false);
            }
            while ( pos < limit && state < target && state != 0 );            
            return (state <= target && state > 0) || pos == limit;
        }
    };
    /**
     * Get the special right tag, general tag or prop
     * @param fmt the dialect format to get it from
     * @return the leftTag
     */
    this.rightTag = function( fmt ) {
        return ("rightTag" in fmt)?fmt.rightTag:("tag" in fmt)?fmt.tag:"";
    };
    /**
     * Get the special left tag, general tag or prop
     * @param fmt the dialect format to get it from
     * @return the leftTag
     */
    this.leftTag = function( fmt ) {
        return ("leftTag" in fmt)?fmt.leftTag:("tag" in fmt)?fmt.tag:"{"+fmt.prop+"}\n";
    };
    /**
     * Get the overall length of the left and right tags
     * @param fmt the dialect format to get them from
     * @return the total length of the two tags
     */
    this.tagLen = function(fmt) {
        return this.leftTag(fmt).length+this.rightTag(fmt).length;
    };
    /**
     * Find the best format in the array given the current selection
     * @param seg the text containing the formats at start and end
     * @param arr the array of formats
     * @return the index of the best-fitting format in arr
     */
    this.findBestFormat = function(seg,arr) {
        var best = -1;
        var bestLen = 0;
        for ( var i=0;i<arr.length;i++)
        {
            var fmt = arr[i];
            var lTag = self.leftTag(fmt);
            var rTag = self.rightTag(fmt);
            var fmtLen = this.tagLen(fmt);
            if ( seg.indexOf(lTag)==0 && seg.lastIndexOf(rTag)==seg.length-rTag.length )
            {
                if ( best == -1 || fmtLen > bestLen )
                {
                    best = i;
                    bestLen = this.tagLen(arr[best]);
                }
            }
        }
        return best;
    };
    /**
     * Remove existing para or line formats
     * @param eb the textarea editbox
     * @param start the line-start position
     * selEnd the end of the current selection
     * @param array of formats it belongs to 
     * @return the length of the new selection
     */
    this.removeFormats = function( eb, start, end, arr ) {
        var rStart = end;
        var rEnd = end;
        var lStart = start;
        var lEnd = start;
        var text = eb.val();
        var seg = text.substring(start,end);
        var best = this.findBestFormat(seg,arr);
        if ( best != -1 )
        {
            lStart = start;
            lEnd = lStart + this.leftTag(arr[best]).length;
            rStart = end - this.rightTag(arr[best]).length;
            rEnd = end;
        }
        if ( rEnd > rStart )
        {
            eb.setSelection( rStart, rEnd );
            eb.deleteSelectedText();
        }
        if ( lEnd > lStart )
        {
            eb.setSelection( lStart, lEnd );
            eb.deleteSelectedText();
        }
        return rStart-lEnd;
    };
    /**
     * Extend the selection IF it is surrounded by a charformat
     * @param text the text
     * @param sel the current selection
     * @param arr an array of charformats from the dialect
     * @return the updated selection object
     */
    this.extendSelection = function( text, sel, arr ) {
        var pre = text.substring(0,sel.start);
        var post = text.substring(sel.end);
        var best = -1;
        var bestLen = 0;
        for ( var i=0;i<arr.length;i++ )
        {
            var fmt = arr[i];
            var lTag = this.leftTag(fmt);
            var rTag = this.rightTag(fmt);
            if ( pre.substring(pre.length-lTag.length) == lTag 
                && post.substring(0,rTag.length)== rTag )
            {
                if ( best == -1 || this.tagLen(fmt) > bestLen )
                {
                    best = i;
                    bestLen = this.tagLen(fmt);
                }
            }
        }
        if ( best != -1 )
        {
            sel.start -= this.leftTag(arr[best]).length;
            sel.end += this.rightTag(arr[best]).length;
        }
        return sel;        
    };
    /**
     * Split a selection into segments if it contains line-breaks
     * @param sel the selection
     * @param id the id of the select dialog
     * @param text the text of the editbox
     * @return an array of selections
     */
    this.splitSelection = function(sel,id,text) {
        var arr = Array();
        // don't spit paras and sections into lines
        if ( id == "paraformats" || id == "sectionformats" )
            arr.push(sel);
        else
        {
            var str = text.substring(sel.start,sel.end);
            var lines = str.split("\n");
            var start = sel.start;
            for ( var i=0;i<lines.length;i++ )
            {
                var s = {};
                s.start = start;
                start += lines[i].length;
                s.end = start;
                start++;    // include NL
                arr.push(s);
            }
        }
        return arr;
    };
    /**
     * Extend selection to full line
     * @param sel the current part-line selection
     * @param text the current text
     * @return the full-line selection
     */
    this.extendToFullLine = function(sel,text) {
        var start = sel.start;
        var end = sel.end;
        for ( var i=start;i>0;i-- )
        {
            var c = text[i-1];
            if ( c == '\n' )
            {
                start = i;
                break;
            }
        }
        for ( var i=end-1;i<text.length;i++ )
        {
            var c = text[i];
            if ( c == '\n' )
            {
                end = i;
                break;
            }
        }
        sel.start = start;
        sel.end = end;
        return sel;
    };
    /** 
     * Trim a part line selection so that it skips over line formats
     * @param sel the selection
     * @param text the text the selection points to
     * @return the adjusted selection
     */
    this.trimLineSelection = function(sel,text) {
        var extSel = {};
        extSel.start = sel.start;
        extSel.end = sel.end;
        var extSel = this.extendToFullLine(extSel,text);
        var line = text.substring(extSel.start,extSel.end);
        var best = this.findBestFormat(line,this.dialect.lineformats);
        if ( best != -1 )
        {
            var fmt = this.dialect.lineformats[best];
            if ( extSel.start == sel.start )
                sel.start += this.leftTag(fmt).length;
            if ( extSel.end == sel.end )
                sel.end -= this.rightTag(fmt).length;
        }
        return sel;
    };
    /**
     * Remove the currently selected format
     * @param id the id of the formatting menu
     */
    this.removeSelectedFormat = function( id ) {
        var eb = this.editbox();
        var sel = eb.getSelection();
        var arr;
        if ( id == "charformats" )
        {
            arr = this.dialect.charformats;
            sel = this.extendSelection( eb.val(), sel, arr );
            this.removeFormats( eb, sel.start, sel.end, arr );
        }
        else 
        {
            var text = eb.val();
            if ( id == "paraformats" )
                arr = this.dialect.paraformats;
            else if ( id == "lineformats" )
                arr = this.dialect.lineformats;
            var sels = self.splitSelection(sel,id,text);
            for ( var i=0;i<sels.length;i++ )
            {
                sels[i] = this.extendToFullLine(sels[i],text);
                this.removeFormats(eb,sels[i].start,sels[i].end,arr); 
            }
        }                
    };
    /**
     * Count the number of words in the current selection
     * @param text the text to look for words in
     * @param from the selection start
     * @param to the selection end
     */
    this.countWords = function( text, from, to ) {
        var nWords = 0;
        var state = 0;
        for ( var i=from;i<to;i++ )
        {
            switch (state)
            {
                case 0: // initial state: seen no text yet
                    if ( !/[ \t\n\r]/.test(text[i]) )
                        state = 2;
                    break;
                case 1: // seen space, looking for text
                    if ( !/] \t\n\r]/.test(text[i]) )
                        state = 2;
                    break;
                case 2: // seen text, looking for space
                    if ( /[ \t\n\r]/.test(text[i]) )
                    {
                        nWords++;
                        state = 1;
                    }
                    break;
            }
        }
        return (state==2)?nWords+1:nWords;
    };
    var decoded = this.editor_decode(udata);
    this.userdata = JSON.parse(decoded);
    // enable editing commands
    var html = '<div id="wrapper"><div id="sides"><div id="lhs"><div id="lhspanel">';
    html += '<div id="versions"></div></div><div id="imglistcontainer">';
    html += '<div id="imglist"></div></div></div>';
    html += '<div id="rhs"><div id="tabs"></div></div></div>';
    html += '<ul id="etoolbar"><li id="delete-layer"><i title="delete current layer" ';
    html += 'class="fa fa-minus fa-1x"></i></li><li id="save"><i title="save" ';
    html += 'class="fa fa-save fa-1x"></i></li><li id="openfile"><i title="Open existing transcription" ';
    html += 'class="fa fa-folder-open-o fa-1x"></i></li><li id="newfile">';
    html += '<i title="New document" class="fa fa-file-o fa-1x"></i></li>';
    html += '<li id="preview"><img title="Preview" src="/main/sites/all/modules/editor/css/fa-preview.png" style="height:15px;"></li>';
    html += '<li id="edit-text"><i title="Edit text" class="fa fa-edit fa-1x"></i><select class="popup" id="edittext"></select></li>';
    html += '<li id="character-formats"><i title="Character formats" class="fa fa-font fa-1x"></i><select class="popup" id="charformats"></select></li>';
    html += '<li id="line-formats"><i title="Line formats" class="fa fa-align-justify fa-1x"></i><select class="popup" id="lineformats"></select></li>';
    html += '<li id="paragraph-formats"><i title="Paragraph formats" class="fa fa-paragraph fa-1x"></i><select class="popup" id="paraformats"></select></li>';
    html += '<li id="section-formats"><span title="Section formats" class="unicode-icon"></span><select class="popup" id="sectionformats"></select></li>';
    html += '<li id="comment"><i title="Add comment" class="fa fa-comment-o" fa-1x"></i></li>';
    html += '<li id="help"><span title="Help" class="help-icon"></span></li>';
    html += '</ul></div>';
    html += '<div id="newversion" class="dialog"><div><p>Create a new version</p></div></div>';
    html += '<div id="opendialog" class="dialog"><div><p>Open an existing file</p></div></div>';
    html += '<div id="newdialog" class="dialog"><div><p>Make a new transcription</p></div></div>';
    html += '<div id="editoption"><span>Edit...</span></div>';
    jQuery("#"+this.target).empty();
    jQuery("#"+this.target).append( html );
    this.hideEditOption();
    jQuery("#edit-text").hide();
    jQuery("#delete-layer").click(function(){
        self.subtractLayer();
    });
    jQuery("#save").click(function(){
        var oldColor = jQuery(this).css("background-color");
        if ( !self.saved || self.annotator.isDirty() )
        {
            jQuery(this).css("background-color","lightgreen");
            self.save();
        }
        else
            jQuery(this).css("background-color","pink");
        setTimeout( function(){
            jQuery("#save").css("background-color",oldColor);
        },600 );
    });
    /**
     * Open file button 
     */
    jQuery("#openfile").click(function(){
        var oldColor = jQuery(this).css("background-color");
        jQuery(this).css("background-color","pink");
        setTimeout( function(){
            jQuery("#openfile").css("background-color",oldColor);
        },400 );
        jQuery("#opendialog").css("visibility","visible");
    });
    /**
     * New file button 
     */
    jQuery("#newfile").click(function(){
        var oldColor = jQuery(this).css("background-color");
        jQuery(this).css("background-color","pink");
        setTimeout( function(){
            jQuery("#newfile").css("background-color",oldColor);
        },400 );
        jQuery("#newdialog").css("visibility","visible");
    });
    /**
     * Preview button 
     */
    jQuery("#preview").click(function(){
        // recompute preview 
        var formatter = new Formatter(self.dialect);
        var text = self.editbox().val();
        var html = formatter.toHTML(text);
        var previewPane = jQuery("#previewpane");
        var previewContents = jQuery("#previewcontents");
        previewContents.empty();
        previewContents.append(html);
        var cWidth = previewPane.width();
        jQuery("#previewcontents div.section").outerWidth(cWidth);
        previewPane.show();
        jQuery("#helpframe").hide();
        self.editbox().hide();
        var rhsHt = jQuery("#rhs").height();
        var tabsHt = jQuery("#tabs").height();
        jQuery("#previewpane").height(rhsHt-tabsHt);
        // reset scroll
        self.recalcPageCentres();
        jQuery("#edit-text").show();
        jQuery("#preview").hide();
        jQuery("#previewpane").off("scroll");
        jQuery("#previewpane").scroll(function(e){
            var pp = jQuery(e.target);
            if ( pp.length == 1 )
            {
                var pc = jQuery("#previewcontents");
                var top = pp[0].scrollTop;
                //console.log("scrollTop="+top);
                var bot = top+pp.height();
                //console.log("pc.height="+pc.height());
                var lCentre = self.interpolate( Math.round((top+bot)/2) );
                var lPanelHt = jQuery("#lhspanel").height();
                lCentre -= (jQuery("#wrapper").height()-lPanelHt)/2;
                jQuery("#imglist").css('top',-Math.round(lCentre)+"px");
            }
        });

    });
    /**
     * Reactivate edit box; hide preview
     */
    jQuery("#edit-text").click(function(){
        var previewPane = jQuery("#previewpane");
        previewPane.hide();
        jQuery("#helpframe").hide();
        self.editbox().show();
        // reset scroll
        self.recalcPageCentres();
        jQuery("#edit-text").hide();
        jQuery("#preview").show();
    });
    /**
     * Character formats button 
     */
    jQuery("#character-formats i").mousedown(function(e){
        self.clearMenus();
        var select = jQuery(e.target).siblings("select");
        if ( select.length == 1 )
            select[0].selectedIndex = 0;
        var cfmts = jQuery("#charformats");
        cfmts.css("display","block");
        cfmts.css("right","0px");
        e.preventDefault();
    });
    /**
     * Line formats button 
     */
    jQuery("#line-formats").click(function(e){
        if (e.target.tagName == "I" )
        {
            self.clearMenus();
            var select = jQuery(e.target).siblings("select");
            if ( select.length == 1 )
                select[0].selectedIndex = 0;
            var lfmts = jQuery("#lineformats");
            jQuery("#lineformats").css("display","block");
            lfmts.css("right","0px");
     }
    });
    /**
     * Paragraph formats button 
     */
    jQuery("#paragraph-formats").click(function(e){
        if (e.target.tagName == "I" )
        {
            self.clearMenus();
            var select = jQuery(e.target).siblings("select");
            if ( select.length == 1 )
                select[0].selectedIndex = 0;
            var pfmts = jQuery("#paraformats");
            jQuery("#paraformats").css("display","block");
            pfmts.css("right","0px");
        }
    });
    /**
     * Section formats button 
     */
    jQuery("#section-formats").click(function(e){
        if (e.target.tagName == "SPAN" )
        {
            self.clearMenus();
            var select = jQuery(e.target).siblings("select");
            if ( select.length == 1 )
                select[0].selectedIndex = 0;
            var sfmts = jQuery("#sectionformats");
            jQuery("#sectionformats").css("display","block");
            sfmts.css("right","0px");
        }
    });
    /**
     * Help button 
     */
    jQuery("#help").click(function(e){
        var ebHeight = self.editbox().height();
        self.clearMenus();
        //1. save current mode
        var previewState = jQuery("#previewpane").css("display");
        if ( previewState =="none" )
        {
            self.editbox().hide();
            self.currentMode = "edit";
        }
        else
        {
            jQuery("#previewpane").hide();
            self.currentMode = "preview";
        }
        if ( jQuery("#helpframe").length==0 )
        {
            var url = "http://"+window.location.hostname+"/misc/?docid=mml/help";
            jQuery.get(url,function(data){
                jQuery("#rhs").append('<div id="helpframe"><div id="helppane">'+data+'</div></div>');
                jQuery("#helpframe").height(ebHeight);
            });
        }
        else
        {
            jQuery("#helpframe").show();
            jQuery("#helpframe").height(ebHeight);
        }
    });
    jQuery(window).keydown(function(e){
        if ( e.keyCode == 27 && self.currentMode != undefined )
        {
            jQuery("#helpframe").hide();
            if ( self.currentMode == "edit" )
                self.editbox().show();
            else
                jQuery("#previewpane").show();
            self.currentMode = undefined;
        }
    });
    jQuery(window).click(function(e){
        if ( jQuery(e.target).parents("#etoolbar").length==0 )
        {
            jQuery(".popup:visible").each(function(){
                jQuery(this).hide();
            });
        }
    });
    // comment button
    jQuery("#comment").click(function(e){
        var eb = self.editbox();
        if ( eb.is(':visible') )
        {
            var where = {};
            var sel = self.editbox().getSelection();
            var text = eb.val();
            where.nWords = self.countWords(text,sel.start,sel.end);
            where.offset = sel.start;
            where.version = self.version1+"/"+self.current;
            where.docid = self.docid;
            self.annotator.addEmptyNote(where);
        }
    });

    /* on change the formatting popup menus will call this */
    jQuery(".popup").change(function(e){
        // NB: can't store raw JSON data in option value
        var select = jQuery(this);
        var id = select.attr("id");
        var value = jQuery(this).val();
        if (value=="remove")
            self.removeSelectedFormat(id);
        else
        {
            var str = self.decodeHex(value);
            var fmt = JSON.parse(str);
            var eb = self.editbox();
            eb.attr('contenteditable','true');
            var sel = eb.getSelection();
            // surround text with chosen tag
            var text = eb.val();
            if ( select.attr("id") == "charformats")
            {
                sel = self.extendSelection(text,sel,self.dialect.charformats);
            }
            else if ( id == "lineformats" )
            {
                while ( !self.isBoundary(text,sel.start,1,true) )
                    sel.start--;
                while ( !self.isBoundary(text,sel.end,1,false) )
                    sel.end++;
            }
            else if ( id == "paraformats" )
            {
                while ( !self.isBoundary(text,sel.start,2,true) )
                    sel.start--;
                while ( !self.isBoundary(text,sel.end,2,false) )
                    sel.end++;
            }
            else if ( id == "sectionformats" )
            {
                while ( !self.isBoundary(text,sel.start,3,true) )
                    sel.start--;
                while ( !self.isBoundary(text,sel.end,3,false) )
                    sel.end++;
            }
            sel.length = (1+sel.end)-sel.start;
            eb.setSelection(sel.start,sel.end);
            if ( sel.start != sel.end )
            {
                var lTag = self.leftTag(fmt)
                var rTag = self.rightTag(fmt);
                var arr;
                if ( id == "charformats" )
                    arr = self.dialect.charformats;
                else if ( select.attr("id") == "lineformats" )
                    arr = self.dialect.lineformats;
                else if ( id =="paraformats")
                    arr = self.dialect.paraformats;
                else if ( id =="sectionformats")
                    arr = self.dialect.sections;
                // split selection into lines here
                // then process each line separately
                var sels = self.splitSelection(sel,id,text);
                for ( var i=0;i<sels.length;i++ )
                {
                    var old = sels[i].end-sels[i].start;
                    var len = self.removeFormats(eb,sels[i].start,sels[i].end,arr); 
                    // adjust selection after previous reformatting
                    sels[i].end = sels[i].start + len;
                    var offset = old-(len+lTag.length+rTag.length);
                    for ( j=i+1;j<sels.length;j++)
                    {
                        sels[j].start -= offset;
                        sels[j].end -= offset;
                    }
                    if ( id == "charformats" )
                        sels[i] = self.trimLineSelection(sels[i],text);
                    eb.setSelection(sels[i].start,sels[i].end);
                    eb.setSelection(sels[i].start,sels[i].end);
                    eb.surroundSelectedText(lTag,rTag);
                    text = eb.val();    // update text!
                    eb.collapseSelection(true);
                }
            }
        }
        jQuery(this).toggle();
    });
    jQuery(".popup").click(function(e){
        if ( jQuery(this).attr("data-expanded") == "true" )
        {
           jQuery(this).attr("data-expanded","false");
           jQuery(this).css("display","none");
           //console.log("hiding, data-expanded is false");
        }
        else
        {
            jQuery(this).attr("data-expanded","true");
            //console.log("NOT hiding, data-expanded is true");
        }
        e.stopPropagation();
        e.preventDefault();
    });
    jQuery(".popup").mousedown(function(e){
        e.stopPropagation();
    });
    jQuery("#character-formats").mousedown(function(e){
        e.preventDefault();
    });
    var tWidth = jQuery("#etoolbar").width();
    var wWidth = jQuery(window).width();
    var parent = jQuery("#"+this.target);
    jQuery("#sides").width(wWidth-tWidth);
    jQuery(".dialog").width(parent.width());
    jQuery(".dialog").height(jQuery(document).height());
    jQuery(".dialog > div").width(Math.round(parent.width()/2));
    this.buildNewVersionDialog();
    this.buildOpenDialog();
    this.buildNewDialog();
    this.getVersions(this.docid);
    this.annotator = new Annotator(this.target,"etoolbar",this.userdata.name);
    this.annotator.load(this.docid);
}
function get_one_param( params, name )
{
    var parts = params.split("&");
    for ( var i=0;i<parts.length;i++ )
    {
        var halves = parts[i].split("=");
        if ( halves.length==2 && halves[0]==name )
            return unescape(halves[1]);
    }
    return "";
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 */
function getEditorArgs( scrName )
{
    var params = new Object ();
    var module_params = jQuery("#editor_params").val();
    if ( module_params != undefined && module_params.length>0 )
    {
        var parts = module_params.split("&");
        for ( var i=0;i<parts.length;i++ )
        {
            var halves = parts[i].split("=");
            if ( halves.length==2 )
                params[halves[0]] = halves[1];
        }
    }
    else
    {
        var scripts = jQuery("script");
        scripts.each( function(i) {
            var src = jQuery(this).attr("src");
            if ( src != undefined && src.indexOf(scrName) != -1 )
            {
                var qStr = src.replace(/^[^\?]+\??/,'');
                if ( qStr )
                {
                    var pairs = qStr.split(/[;&]/);
                    for ( var i = 0; i < pairs.length; i++ )
                    {
                        var keyVal = pairs[i].split('=');
                        if ( ! keyVal || keyVal.length != 2 )
                            continue;
                        var key = unescape( keyVal[0] );
                        var val = unescape( keyVal[1] );
                        val = val.replace(/\+/g, ' ');
                        params[key] = val;
                    }
                }
                return params;
            }
        });
    }
    if ( !('docid' in params) )
    {
        var tabs_params = jQuery("#tabs_params").val();
        if ( tabs_params != undefined && tabs_params.length>0 )
            params['docid'] = get_one_param(tabs_params,'docid');
    }
    if ( !('udata' in params) )
    {
        var tabs_params = jQuery("#tabs_params").val();
        if ( tabs_params != undefined && tabs_params.length>0 )
            params['udata'] = get_one_param(tabs_params,'udata');
    }
    if ( !('version1' in params) )
        params['version1'] = "/base";
    return params;
}
/* main entry point - gets executed when the page is loaded */
jQuery(function(){
    var params = getEditorArgs('editor');
    jQuery("#"+params['mod-target']).css("visibility","hidden");
    var viewer = new editor(params['docid'],params['version1'],params['mod-target'],params['udata']);
});



