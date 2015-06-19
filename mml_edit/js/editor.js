/*
 * This file is part of MML.
 *
 *  MML is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  MML is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with MML.  If not, see <http://www.gnu.org/licenses/>.
 *  (c) copyright Desmond Schmidt 2015
 */
/**
 * MML editor main file for ecdosis
 * @param target the id of the element to add ourselves to
 * @param docid the document identifier
 * @param modpath the path to this module for fetching resources
 */
function Editor( target, docid, modpath )
{
    this.target = target;
    this.modpath = modpath;
    this.docid = docid;
    this.encoding = "UTF-8";
    var self = this;
    /**
     * Extract the page refs in the order in which they appear in the MML
     * @return a comma-separated list of page references e.g. 4e,2f
     */
    this.getPageRefs = function() {
        if ( this.dialect.milestones != undefined )
        {
            var leftTag,rightTag;
            var mls = this.dialect.milestones;
            for ( var i=0;i<mls.length;i++ )
            {
                if ( mls[i].prop == "page" )
                {
                    leftTag = mls[i].leftTag;
                    rightTag = mls[i].rightTag;
                    break;
                }
            }
            if ( leftTag != undefined && rightTag != undefined )
            {
                var sb = "";
                var state = 1;
                current = "";
                for ( var i=0;i<this.text.length;i++ )
                {
                    var c = this.text[i];
                    switch ( state )
                    {
                        case 0:
                            if ( c == '\n' )
                                state = 1;
                            break;
                        case 1:
                            if ( c == leftTag )
                                state = 2;
                            else if ( c != '\n' )
                                state = 0;
                            break;
                        case 2:
                            if ( c != rightTag )
                                current += c;
                            else
                            {
                                if ( sb.length > 0 )
                                    sb += ',';
                                sb += current;
                                current = "";
                                state = 0;
                            }
                            break;
                    }
                }
                return sb;
            }
        }
        return null;
    };
    /**
     * Get the images for this document
     */
    this.getImages = function() {
        var url = "/mml/images?docid="+this.docid
            +"&version1="+this.version1;
        var pageRefs = this.getPageRefs(this.text);
        if ( pageRefs != null && pageRefs.length>0 )
            url += "&pagerefs="+pageRefs;
        $.get(url,function(data) {
            self.images = data;
            self.reload();
            self.mml = new MML( self.opts, self.dialect );
        })
        .fail( function() {
            alert("failed to load images");
        });
    };
    /**
     * Get the mml text for this document
     */
    this.getMml = function() {
        $.get("/mml/mml?docid="+this.docid+"&version1="+this.version1,
            function(data) {
            self.text = data;
            self.getImages();
        })
        .fail(function() {
            alert("failed to load MML");
        });
    };
    /**
     * Get the short version of the docid (language/author/work)
     * @return a shortened docid for dialect etc
     */
    this.shortID = function() {
        var parts = this.docid.split("/");
        if ( parts.length>= 3 )
        {
            var sb = "";
            sb += parts[0];
            sb += "/";
            sb += parts[1];
            sb += "/";
            sb += parts[2];
            return sb;
        }
        else
            return this.docid;
    };
    /**
     * Get the list of versions
     */
    this.getVersions = function() {
        $.get("/mml/versions?docid="+this.docid,
            function(data) {
            self.versions = data;
            self.setup();
        })
        .fail(function() {
            alert("failed to load versions");
        });
    };
    /**
     * Get the css for this document
     */
    this.getCss = function() { 
        $.get("/mml/corform/"+this.shortID()+"/default",
            function(data){
            var styleElement = '<style type="text/css">\n'+data+'\n</style>';
            $("head").append(styleElement);
                self.getVersions();
        })
        .fail(function() {
            alert("failed to load css");
        });
    };
    /**
     * Get the opts for this editor
     * @return a JSON document
     */
    this.getOpts = function() {
        return {
            source: "source",
            target: "target",
            images: "images",
            formid: "tostil"
        };
    };
    /**
     * Get the metadata
     */
    this.getMetadata = function() {
        $.get( "/mml/metadata?docid="+docid, 
            function( data ) {
                self.style = (data.style)?data.style:"TEI/default";
                self.title = (data.title)?data.title:"Untitled";
                self.author = (data.author)?data.author:"Anonymous";
                self.getCss();
        })
        .fail(function() {
            alert("failed to load metadata");
        });
    };
    /**
     * Get the MML dialect file and initialise the editor
     */
    this.getDialect = function() {
        $.get( "/mml/dialect?docid="+docid, 
            function( data ) {
                self.dialect = data;
                self.getMetadata();
        })
        .fail(function() {
            alert("failed to load dialect");
        });
    };
    /**
     * Get the first version of the cortex
     */
    this.getVersion1 = function() {
        $.get( "/mml/version1?docid="+docid, 
            function( data ) {
                self.version1 = data;
                self.getDialect();
         })
        .fail( function() {
            alert("failed to load metadata");
        });
    };
    /**
     * Reformat the text, html and images
     */
    this.reload = function() { 
        $("#images").replaceWith( this.images );
        $("#source").text(this.text);
        $("#version1").val(this.version1);
        if ( self.mml != undefined )
        {
            self.mml.changed = true;
            self.mml.recomputeImageHeights();
        }
    }; 
    /**
     * Add a single hidden tag to the form
     * @param name the name of the hidden input
     * @param value the value of the input 
     */
    this.writeHiddenTag = function( name, value ) {
        $("form").append('<"input type="hidden" name="'
            +name+'" id="'+name+' value="'+value+'"></input>');
    };
    /**
     * Write the hidden metadata needed back by the server
     */
    this.writeHiddenTags = function() {
         $("#"+this.target).append('<form action="'+this.requestURL
            +'" style="display:none">');
        // if visible it will take up space
        this.writeHiddenTag( "docid", docid);
        this.writeHiddenTag( "encoding","UTF-8");
        this.writeHiddenTag( "style", this.baseID() ); 
        this.writeHiddenTag( "version1", this.version1 );
    };
    /**
     * Add a temporary toolbar at the top.
     */
    this.createToolbar = function() {
        $("#"+this.target).append('<div id="toolbar"></div>');
        $("#toolbar").append( '<div id="toolbar-wrapper"></div>' );
        $("#toolbar-wrapper").append('<button title="saved" class="saved-button" '
            +'disabled="disabled" id="saved"></button>');
        $("#toolbar-wrapper").append('<button title="about the markup" '
            +'class="info-button" id="info"></button>');
        $("#toolbar-wrapper").append('<button title="add a note" '
            +'class="annotate-button" id="annotate"></button>');
        $("#toolbar-wrapper").append(this.getStyles());
        $("#toolbar-wrapper").append(this.getVersionDropdown());
    }
    /**
     * Build the page for the editor, ready to receive images and text
     */
    this.composePage = function() {
        this.createToolbar();
        $("#"+this.target).append('<div id="wrapper"></div>');
        $("#wrapper").append('<div id="images"></div>');
        $("#wrapper").append('<div id="help"></div>');
        $("#wrapper").append('<textarea id="source"></textarea>');
        $("#wrapper").append('<div id="target"></div>');
        this.writeHiddenTags();
    };
    /**
     * Set up the entire page (called by getMml)
     */
    this.setup = function() {
        this.opts = self.getOpts();
        this.service = window.location.pathname;
        this.host = window.location.hostname;
        this.requestURL = window.location.href;
        this.composePage();
        this.getMml();   // also gets images
        $(window).load(function() {
            self.mml.recomputeImageHeights();
        }); 
        $("#versions").change(function() {
            self.version1 = $(this).val();
            self.getMml();
        });
    };
    /**
     * Escape characters if the string was set to the value of an option
     * @param value the value of a select option
     * @return the value with <, >, " escaped (<=&lt;,>=&gt;,"=<q>)
     */
    this.escape = function( value ) {
        var sb = "";
        for ( var i=0;i<value.length;i++ )
        {
            var c = value.charAt(i);
            if ( c == '"' )
                sb += "<q>";
            else if ( c == '<' )
                sb += "&lt;";
            else if ( c == '>')
                sb += "&gt;";
            else
                sb += c;
        }
        return sb;
    }
    /**
     * Add a single option-group to the styles menu
     * @param select the partially complete select element
     * @param dObj the dialect JSON object
     * @param name the name of the format collection in dObj
     * @param label the name of the optgroup to appear in menu
     * @return the select HTML augmented
     */
    this.addOptGroup = function( select, dObj, name, label ) {
        var items = dObj[name];
        if ( items != undefined )
        {
            var group = '<optgroup label="'+label+'">';
            for ( var i=0;i<items.length;i++ )
            {
                var item = items[i];
                var option = '<option';
                item.type = name;
                var value = JSON.stringify(item);
                value = this.escape(value);
                option += ' value="'+value+'">';
                var text = item.prop;
                option += text;
                option += '</option>';
                group += option;
            }
            group += '</optgroup>';
            select += group;
        }
        return select;
    };
    /**
     * Recursively build options in a select
     * @param set the set of options and groups
     * @return the html contents of the select
     */
    this.buildOptions = function( set ) {
        var html = "";
        var keys = [];
        for (var key in set) 
        {
            if (set.hasOwnProperty(key))
                keys.push(key);
        }
        for ( var i=0;i<keys.length;i++ )
        {
            var key = keys[i];
            if ( set[key].desc != undefined )
                html += '<option title="'+set[key].desc
                    +'" value="'+set[key].value+'">'+key+'</option>';
            else if ( key != "Base" )
                html += '<optgroup label="'+key+'">'
                    +this.buildOptions(set[key])+'</optgroup>';
            else
                html += this.buildOptions(set[key]);
        }
        return html;
    };
    /**
     * Create a select dropdown with the docid's versions
     * @return a select list with groups for grouped versions
     */
    this.getVersionDropdown = function() {
        var select = '<select id="versions">';
        if ( this.versions == undefined || this.versions.length==0 )
        {
            this.versions = new Array();
            this.versions.push(this.version1);
        }
        var set = {};
        for ( var i=0;i<this.versions.length;i++ )
        {
            var parts = this.versions[i].vid.split("/");
            var current = set;
            for ( var j=0;j<parts.length;j++ )
            {
                if ( parts[j].length>0 )
                {
                    if ( current[parts[j]] == undefined )
                        current[parts[j]] = {};
                    current = current[parts[j]];
                }
            }
            current['desc'] = this.versions[i].desc;
            current['value'] = this.versions[i].vid;
        }
        select += this.buildOptions(set);
        select += '</select>';
        return select;
    };
    /**
     * Create a select dropdown with the dialect's styles
     * @return a select list with groups for para headings and charfmts
     */
    this.getStyles = function() {
        var dObj = this.dialect;
        var select = '<select id="styles">';
        select = this.addOptGroup(select,dObj,"headings","headings");
        select = this.addOptGroup(select,dObj,"paraformats","paragraph formats");
        select = this.addOptGroup(select,dObj,"charformats","character formats");
        select = this.addOptGroup(select,dObj,"dividers","dividers");
        select = this.addOptGroup(select,dObj,"milestones","milestones");
        select = this.addOptGroup(select,dObj,"codeblocks","verbatim");
        select = this.addOptGroup(select,dObj,"quotations","quotations");
        select += '</select>';
        return select;
    };
    /**
     * Get the basic ID from docid (just language/author)
     * @return a String
     */
    this.baseID = function() {
        var parts = this.docid.split("/");
        if ( parts.length>= 2 )
        {
            sb = "";
            sb += parts[0];
            sb += "/";
            sb += parts[1];
            return sb;
        }
        else
            return this.docid;
    };
    // now call the cascade of functions to setup everything
    this.getVersion1();
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 */
function getArgs( scrName )
{
    var scripts = jQuery("script");
    var params = new Object ();
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
    return params;
}
/* main entry point - gets executed when the page is loaded */
jQuery(function(){
    // DOM Ready - do your stuff 
    var params = getArgs('editor.js');
    var editor = new Editor('content',params['docid'],params['modpath']);
}); 

