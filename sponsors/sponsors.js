/**
 * Object to represent sponsors in HTML
 */
function sponsors(target)
{
    this.target = target;
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
    };
    var self = this;
    jQuery.get( "http://"+window.location.hostname+"/project/sponsors", function(data) 
    {    
        var html = "";
        var items = data;
        for ( var i=0;i<items.length;i++ )
            html += '<p><a href="'+items[i].url+'">'
            +'<img src="http://'+window.location.hostname+items[i].image
            +'" style="width:100%" title="'+items[i].title+'">'
            +'</a></p>\n';
        self.setHtml(html);
    });	
}
jQuery(document).ready( 
    function(){
        new sponsors("block-sponsors-sponsors");
    }
); 
