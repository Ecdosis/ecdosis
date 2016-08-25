/**
 * global document object
 */
function editor( docid, version1, target )
{
    this.docid = docid;
    this.iOffset = 0;
    this.nInterp = 4;
    this.target = target;
    /** version to edit */
    this.version1 = version1;
    var self = this;
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
        //console.log("lineHeight="+this.lineHeight);
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
     * Extract the numerical value of a css property terminated by "px"
     * @param id the element to get the property off
     * @param param the name of the css property
     * @return its integer value
     */
    this.getCssParam = function(id,param)
    {
        var value = jQuery("#"+id).css(param);
        if ( value.lastIndexOf('px') != -1 )
            value = value.substring(0,value.length-2);
        if ( value.length== 0 )
            return 0;
        else
            return parseInt(value);
    };
    /**
     * Compute space of horizontal borders and padding by the toolbar
     * @return an int value
     */
    this.calcTbSlop = function()
    {
        var slop = this.getCssParam('toolbar','border-left-width');
        slop += this.getCssParam('toolbar','border-right-width');
        slop += this.getCssParam(this.current,'padding-left');
        slop += this.getCssParam(this.current,'padding-right');
        return slop;
    };
    /**
     * Re-calculate the page-centres after the initiation
     */
    this.recalcPageCentres = function(){
        this.getPageCentres();  
        this.editbox().scrollTop(0);
        jQuery("#lhs").css('top',"0px"); 
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
        ebWidth = Math.round(ebWidth*3/4);
        var magnifiedSize = Math.floor(12*ebWidth/maxWidth);
        console.log("ebWidth="+ebWidth+" maxWidth="+maxWidth);
        var newSize = magnifiedSize+"px";
        //jQuery("#measure-text").css("font-size",newSize);
        //var newWidth = jQuery("#measure-text").width();
        //console.log("newWidth="+newWidth);
        jQuery("#measure-text").remove();
        eb.css("font-size",newSize);
        console.log("newSize="+newSize);
        this.getLineHeight(this.editbox());  // NB computes this.ebSlop
        var tbHt = jQuery("#tabs").height();
        var ht = jQuery("#wrapper").height()-(this.ebSlop+tbHt);
        var nrows = Math.floor(ht/this.lineHeight);
        eb.attr("rows",nrows);
        var newEbWidth = jQuery("#rhs").width()-this.calcTbSlop();
        eb.width(newEbWidth);
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
                if ( this.rCentres[i] > this.rCentres[0]
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
            //this.printArray( this.lCentres);  
            //this.printArray( this.rCentres);
        }
    };
    /**
     * Debug: print an array of ints
     * @param arr the array to print
     */
    this.printArray = function( arr )
    {
        var str = "(";
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
        var imgs = jQuery("#lhs img");
        var top = 0;
        var lOff = jQuery("#lhs").offset().top;
        imgs.each(function(){
            var v;
            top = v = Math.round(jQuery(this).offset().top-lOff);
            lTops.push(v);
        });
        var v = top+imgs.last().height();
        lTops.push(v);
        this.lCentres = Array();
        for ( var i=1;i<lTops.length;i++ )
        {
            var diff = lTops[i]-lTops[i-1];
            this.lCentres.push( Math.round(lTops[i-1]+diff/2) );
        }
        this.imageEnd = lTops[lTops.length-1];
        // fudge first and last pages which aren't centred
        this.lCentres[0] = jQuery("#wrapper").height()/2;
        this.lCentres[self.lCentres.length-1] = self.imageEnd - jQuery("#wrapper").height()/2;
        //console.log("lCentres:");
        //this.printArray(this.lCentres);
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
            console.log("btnPadNewTop="+btnPadNewTop+" btnPadNewBot="+btnPadNewBot+" tabHt="+tabHt+" btnHt="+btnHt);
            jQuery("#toolbar li").css("padding-top",btnPadNewTop+"px");
            jQuery("#toolbar li").css("padding-bottom",btnPadNewBot+"px");
        }
    };
    /**
     * Fetch the images corresponding to the page numbers in the text
     * @param docid the document identifier with the pages in it
     */
    this.getPageImages = function(docid)
    {
        var url = "http://"+window.location.hostname+"/pages/list?docid="+docid;
        jQuery.get(url,function(data) {
            var html = "";
            self.setWidths();
            var maxW = jQuery("#lhs").width();
            for ( var i=0;i<data.length;i++ )
            {
                var p = data[i];
                var ratio = maxW/p.width;
                var w = Math.round(p.width*ratio);
                var h = Math.round(p.height*ratio);
                html += '<img src="'+p.src+'" width="'+w
                    +'" height="'+h+'" title="'+p.n+'" data-n="'+p.n+'">\n';
            }
            jQuery("#lhs").append(html);
            self.fitText();
            self.getImageCentres();
            self.recalcPageCentres();
            jQuery("#lhs").height(jQuery("#rhs").height());
            self.setButtonHeight();
            jQuery("#"+self.target).css("visibility","visible");
            setInterval(function(){
                //console.log("calling interval function");
                if ( self.dirty == undefined || self.dirty )
                {
                    //self.printArray(self.rCentres);
                    //console.log("recomputing page centres");
                    self.recalcText();
                    self.recalcPageCentres();
                    self.dirty = false;
                    //self.printArray(self.rCentres);         
                }
            },
            3000);
        });
    };
    /**
     * Get the centre points of the pages
     */
    this.getPageCentres = function()
    {
        var rTops = Array();
        var current = 0;
        for ( var i=0;i<this.lines.length;i++ )
        {
            if ( this.lines[i].match("\[[0-9]+\]") )
            {
                var v = Math.round(current);
                rTops.push( v );
            }
            current += this.lineHeight;
        }
        if ( rTops.length > 0 && rTops[rTops.length-1] < current )
        {
            var v = Math.round(current);
            rTops.push( v );
        }
        this.rCentres = Array();
        for ( var i=1;i<rTops.length;i++ )
        {
            var diff = rTops[i]-rTops[i-1];
            this.rCentres.push( Math.round(rTops[i-1]+diff/2) );
        }
        this.textEnd = rTops[rTops.length-1];
        // fudge first and last pages which aren't centred
        this.rCentres[0] = this.editbox().height()/2;
        this.rCentres[this.rCentres.length-1] = this.textEnd 
            - this.editbox().height()/2;
        //printArray( this.lCentres);
        //printArray(this.rCentres);
        this.checkCentres();
        //console.log("nlines ="+this.lines.length);
        //console.log("rCentres:");
        //this.printArray(this.rCentres);
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
                    // value < than first item
                    return -1;  
                else
                    bot = mid-1;
            }
            else    // value >= list[mid]
            {
                if ( mid == list.length-1 )
                    // value is >= last item
                    break;
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
        var index = this.getIndex( this.rCentres, rVal );
        //console.log("index="+index+"("+this.rCentres.length+")");
        var prev = this.rCentres[index];
        var next = this.rCentres[index+1];
        var fromPrev = (rVal-prev)/(next-prev);
        var lPrev = this.lCentres[index];
        var lNext = this.lCentres[index+1];
        return Math.round(lPrev+(lNext-lPrev)*fromPrev);
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
        this.fitText();
        this.recalcPageCentres();
        this.editbox().scrollTop(0);
        jQuery("#lhs").css('top',"0px");
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
     * Add a new layer by copying the first layer
     */
    this.newLayer = function() {
        // add click-handler to previous tab
        this.addClickToActiveTab();
        var contents = this.editbox().val();
        this.dirty = false;
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
        self.fitText();
        self.recalcPageCentres();
        self.editbox().scroll(function(e){
            var eb = e.target;
            var top = jQuery(eb).scrollTop();
            // console.log("top="+top);
            var bot = top+self.editbox().height();
            var lCentre = self.interpolate( (top+bot)/2 );
            // console.log("top="+top+" bot="+bot+" lCentre="+lCentre+" rVal="+(top+bot)/2);
            lCentre -= jQuery("#sides").height()/2;
            jQuery("#lhs").css('top',-Math.round(lCentre)+"px");
        });
        self.editbox().keydown(function(){
            self.dirty = true;
            //console.log("Set dirty to true");
        });
    };
    /**
     * Save the version to the server scratch database
     */
    this.save = function(){
        var url = "http://"+window.location.hostname+"/mml/dialect?docid="+this.docid;
        jQuery.get(url,function(data){
            var formatter = new Formatter(data);
            var packet = {};
            packet.layers = [];
            packet.docid = self.docid;
            packet.version1 = self.version1;
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
            jQuery.post("http://"+window.location.hostname+"/mml/version",
                 obj, function(data){
                     console.log(data)
                 });
        });
    };
    /**
     * Fetch the text from the server via its docid
     */
    this.getText = function(docid)
    {
        var url = "http://"+window.location.hostname+"/mml/mml?docid="+docid;
        jQuery.get(url,function(data) {
            var html = '<table><tr><td class="empty-tab">empty</td>';
            html += '<td id="plus-tab">+</td>';
            for ( var i=0;i<data.layers.length;i++ )
            {
                jQuery("#rhs").append('<textarea class="editbox-inactive" id="layer-'
                    +data.layers[i].name+'"></textarea>');
                jQuery("#layer-"+data.layers[i].name).val(data.layers[i].body);
                var tabName = data.layers[i].name=="final"
                    ?"layer-final":"layer-"+data.layers[i].name;
                html += '<td class="inactive-tab">'+tabName+'</td>';
            }
            html += '</tr></table>';
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
            self.getPageImages(docid);
            self.editbox().scroll(function(e){
                var eb = e.target;
                var top = jQuery(eb).scrollTop();
                // console.log("top="+top);
                var bot = top+self.editbox().height();
                var lCentre = self.interpolate( (top+bot)/2 );
                // console.log("top="+top+" bot="+bot+" lCentre="+lCentre+" rVal="+(top+bot)/2);
                lCentre -= jQuery("#sides").height()/2;
                jQuery("#lhs").css('top',-Math.round(lCentre)+"px");
            });
            jQuery("#plus-tab").click(function(){
                self.newLayer();
            });
            self.editbox().keydown(function(){
                self.dirty = true;
                console.log("Set dirty to true");
            });
        });
    };
    var html = '<div id="wrapper"><div id="sides"><div id="lhs"></div>'
    html += '<div id="rhs"><div id="tabs"></div></div></div>';
    html += '<ul id="toolbar"><li id="delete-layer"><i title="delete current layer" '
    html += 'class="fa fa-minus fa-1x"></i></li><li id="save"><i title="save" '
    html += 'class="fa fa-save fa-1x"></i></li></ul></div>';
    jQuery("#"+this.target).empty();
    jQuery("#"+this.target).append( html );
    jQuery("#delete-layer").click(function(){
        self.subtractLayer();
    });
    jQuery("#save").click(function(){
        self.save();
    });
    var tWidth = jQuery("#toolbar").width();
    var wWidth = jQuery(window).width();
    jQuery("#sides").width(wWidth-tWidth);
    this.getText(this.docid);
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
    if ( !('version1' in params) )
        params['version1'] = "base";
    return params;
}
/* main entry point - gets executed when the page is loaded */
jQuery(function(){
    var params = getEditorArgs('editor');
    jQuery("#"+params['mod-target']).css("visibility","hidden");
    var viewer = new editor(params['docid'],params['version1'],params['mod-target']);
}); 

