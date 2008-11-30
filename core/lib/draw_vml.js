/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */
// #ifdef __WITH_DRAW
//#ifdef __ENABLE_DRAW_VML
jpf.draw.vml = {
    // @Todo test resize init charting, z-index based on sequence

    init : function(o){
        
        jpf.importCssString(document, "v\\:* {behavior: url(#default#VML);}");
        
        o.oExt.onselectstart = function(){
            return false;
        }
        o.oInt.innerHTML = "\
            <div style='z-index:10000;position:absolute;left:0px;width:0px;\
                        background:url(images/spacer.gif);width:"+
                        o.oExt.offsetWidth+"px;height:"+o.oExt.offsetHeight+"px;'>\
            </div>\
            <div style='margin: 0 0 0 0;padding: 0px 0px 0px 0px; \
                        position:absolute;left:0;top:0;width:"+
                        o.oExt.offsetWidth+';height:'+o.oExt.offsetHeight+
                        ";overflow:hidden;'>\
            </div>";
        o.vmlroot = o.oInt.lastChild;
        return this;
    },
        
    initLayer : function(l){ 

        var p = l.parentNode.vmlroot?l.parentNode:l.parentNode.parentNode;
        var vmlroot = p.vmlroot;
        
        var tag = "<div style='position:absolute;left:"+l.left+
                  ";top:"+l.top+";width:"+l.width+";height:"+l.height+
                  ";overflow:hidden;'/>";
 
        l.ds = 4;
        l.dx = 0;
        l.dy = 0;
        l.dw = parseFloat(l.width)*l.ds;
        l.dh = parseFloat(l.height)*l.ds;
        
        l.vmltag = "style='position:absolute;display:block;left:0;top:0;width:"+
                   (l.width)+";height:"+(l.height)+
        ";overflow:hidden;' coordorigin='0,0' coordsize='"+(l.dw+1)+","+(l.dh+1)+"'";
        vmlroot.insertAdjacentHTML("beforeend", tag);
        var vmlgroup = vmlroot.lastChild;

        l._styles       = [];
        l._htmljoin     = [];
        l._vmlgroup = vmlgroup;
    },

    updateLayer : function(l){
        // update layer position, and perhaps z-order?
    },
     
    deinitLayer : function(l){
        // we should remove the layer from the output group.
        l._vmlgroup.removeNode();
        l._vmlgroup = 0;
    },

    beginLayer : function(l){
        this.l = l,this.mx="",this.my="",this.last=null;
        return [ this.jssVars,
                "var _t,_u,_l,_dx,_dy,_tn,_tc,_lc,_s,_p,_styles = this._styles;"
        ].join('');
    },

    endLayer : function(){
        var l = this.l;
        var s = [this.$endDraw()];

        l._vmlgroup.innerHTML = l._htmljoin.join('');
        var j = 0,i = 0, t, k, v, len = this.l._styles.length;
        for(;i<len;i++){
            var style = this.l._styles[i];
            if(style._prev===undefined){ // original style
                var n = l._vmlgroup.childNodes[j++];
                if(style.isshape){
                    style._vmlnode = n;
                    style._vmlfill = n.firstChild.nextSibling;
                    style._vmlstroke = n.lastChild;
                    //alert(style._vmlstroke.color='red');
                    s.push(this.$finalizeShape(style));
                }
                else{
                    style._txtnode = n;
                    s.push(this.$finalizeText(style));
                }
            }
        }
        this.l = null;
        return s.join('');
    },
    reset : function(style){
       return "_p=(_s=_styles["+style._id+"])._path=[];";
    },
    shape : function(style) {
        if(!style.active)return -1;
        var l=this.l, html = l._htmljoin, i, t,
            shape=[], path=[], child=[], opacity="", s=[this.$endDraw()];
        style._path = [];
        style._id = l._styles.push(style)-1;
        this.style = style;

        // find a suitable same-styled other shape so we minimize the VML nodes
        for(i = l._styles.length-2;i>=0;i--){
            if(!l._styles[i]._prev && 
                this.equalStyle( l._styles[i], style )){
                style._prev = i;
                break;
            }
        }

        if(style._prev === undefined) {
            s.push("_p=(_s=_styles[",style._id,"])._path=[];");
            // lets check the style object. what different values do we have?
            if(typeof style.tile != 'undefined'){
                var fillalpha = style.fillalpha;
                if( this.dynJSS(fillalpha) ){
                    fillalpha = '1';
                    s.push("_s._vmlfill.opacity=",style.fillalpha,";");
                };
                if(this.dynJSS(style.tile)){
                    s.push("if(_s._vmlimg!=(_t=",style.tile,"))_s._vmlfill.src=_t;");
                    child.push("<v:fill origin='0,0' position='0,0' opacity='",fillalpha,
                                "' src='' type='tile'/>"); 
                }else{
                    child.push("<v:fill origin='0,0' position='0,0' opacity='",fillalpha,
                         "'  src='",style.tile,"' type='tile'/>"); 
                    if(style.tilex || style.tiley){
                        style._img = new Image(); style._img.src = style.tile;
                        if(style.tilex)
                            s.push("_s._vmlfill.origin.x=((_t=((",
                                style.tilex,")/(_s._img.width))%1)<0?1+_t:_t);");
                        if(style.tiley)
                            s.push("_s._vmlfill.origin.y=((_t=((",
                                style.tiley,")/_s._img.height)%1)<0?1+_t:_t);");
                    }
                }
                s.push("_p.push('m',_dx=-_s._img.width*100,' ',_dy=-_s._img.height*100,",
                       "',l',_dx,' ',_dy);");
            }else
            if(style.fill !== undefined){
                // check if our fill is dynamic. 
                var fill = style.fill, fillalpha = style.fillalpha,
                    angle = style.angle, gradalpha = style.gradalpha;
                if(!fill.sort)fill=[fill];
                var len = fill.length;
                var color='black', colors, color2, colJSSors;
                // precalc the colors value, we might need it later
                if(len>2){
                    for(i=1;i<len-1&&!this.dynJSS(fill[i]);i++);
                    if(i!=len-1){ // its dynamic
                        for(t=[],i=1;i<len-1;i++)
                            t.push(i>1?'+",':'"',Math.round((i/(len-1))*100),'% "+',
                              this.colJSS(fill[i]));
                        colors = t.join('');
                        colJSSors = 1;
                    }else{
                        for(t=[],i=1;i<len-1;i++)
                            t.push(i>1?',':'',Math.round((i/(len-1))*100),'% ',fill[i]);
                        colors = t.join(''); 
                    }
                }
                if(len>1){
                    // we have a gradient
                    if( this.dynJSS(gradalpha) || this.dynJSS(fillalpha)){
                        // hack to allow animated alphas for gradients. There is no o:opacity2 property unfortunately
                        if(gradalpha == fillalpha)fillalpha='_t='+fillalpha,gradalpha='_t';
                        if(len>2)t=gradalpha,gradalpha=fillalpha,fillalpha=t;
                        s.push(
                          "if(_s._vmldata!=(_t=", 
                           "[\"<v:fill opacity='\",(",fillalpha,"),\"' method='none' ",
                           "o:opacity2='\",",gradalpha,",\"' color='\",",
                           this.colJSS(fill[0]),",\"' color2='\",",
                           this.colJSS(fill[len-1]),",\"' type='gradient' angle='\",parseInt(((",
                           angle,")*360+180)%360),\"' ", colors?(colJSSors?"colors='\","+
                           colors+",\"'":"colors='"+colors+"'"):"",
                           "/>\"].join(''))){",
                           "_s._vmlnode.removeChild(_s._vmlfill);",
                           "_s._vmlnode.insertAdjacentHTML( 'beforeend',_s._vmldata=_t);",
                           "_s._vmlfill = _s._vmlnode.lastChild;}");
                        child.push("<v:fill opacity='0' color='black' type='fill'/>");
                    }else{
                        if(len>2)t=gradalpha,gradalpha=fillalpha,fillalpha=t;
                        if( this.dynJSS(fill[0]) )
                            s.push("_s._vmlfill.color=",this.colJSS(fill[0]),";");
                        else color = fill[0];

                        if(this.dynJSS(fill[len-1]))
                            s.push("_s._vmlfill.color2=",
                                this.colJSS(fill[len-1]),";");
                        else color2 = fill[len-1];
                        
                        if(colJSSors){
                          s.push("_s._vmlfill.colors.value=",colors,";");
                        }
                        if( this.dynJSS(angle) ){
                            angle = '0';
                            s.push("_s._vmlfill.angle=(((",style.angle,")+180)*360)%360;");
                        };
                        if( this.dynJSS(fillalpha) ){
                            fillalpha = '1';
                            s.push("_s._vmlfill.opacity=",style.fillalpha,";");
                        };
                        child.push("<v:fill opacity='",
                            fillalpha,"' method='none' o:opacity2='",
                            gradalpha,colors?"' colors='"+colors+"'":"",
                            "' color='",color,"' color2='",color2,
                            "' type='gradient' angle='",(angle*360+180)%360,"'/>");
                    }
                }else{
                    if( this.dynJSS(fillalpha) ){
                            fillalpha = '1';
                            s.push("_s._vmlfill.opacity=",style.fillalpha,";");
                    };
                    if( this.dynJSS(fill[0]) )
                        s.push("_s._vmlfill.color=",this.colJSS(fill[0]),";");
                    else color = fill[0];
                
                    child.push("<v:fill opacity='",fillalpha,
                        "' color=",this.colJSS(color)," type='fill'/>");
                }
                shape.push("fill='t'"),path.push("fillok='t'");
            } else {
                shape.push("fill='f'"),path.push("fillok='f'");
            }
            if(style.line !== undefined){
                var weight = style.weight,
                    alpha = style.linealpha,
                    line = style.line;
                if( this.dynJSS(alpha) ){
                        alpha = '1';
                        s.push("_s._vmlstroke.opacity=",style.alpha,";");
                }
                if( this.dynJSS(weight) ){
                        weight = '1';
                        s.push("_t=",style.weight,
                            ";_s._vmlstroke.weight=_t;if(_t<",alpha,
                            ")_s._vmlstroke.opacity=_t;");
                }
                if( this.dynJSS(line) ){
                        line = 'black';
                        s.push("_s._vmlstroke.color=",this.colJSS(style.line),";");
                }
                    
                child.push("<v:stroke opacity='",
                    weight<1?(alpha<weight?alpha:weight):alpha,
                    "' weight='",weight,"' color=",this.colJSS(line),"/>");
            } else {
                shape.push("stroke='f'"), path.push("strokeok='f'");
            }
            html.push(["<v:shape alignshape='f' ",l.vmltag," path='' ",shape.join(' '),"><v:path ",
                    path.join(' '),"/>",child.join(' '),"</v:shape>"].join(''));
        }  
        /*
        if(style._prev !== undefined){
            if(this.last !== style._prev)
                s.push("_p=(_s=_styles[",style._prev,"])._path;");
        }    */
        return s.join('');
    },
    
    // state based drawing
    stateshape:function( style, ml,mt,mr,mb ){

        if(!style.$statelist || !style.$statelist.length){
            return this.shape(style,ml,mt,mr,mb);
        }
        
        this.sml = ml, this.smt = mt, this.smr = mr, this.smb = mb;
        var s = [
            this.shape(style,ml,mt,mr,mb),
            "_sh = _s.$statehash, _sl = _s.$storelist,",
            "_st= jpf.draw.stateTransition,_sp = _s.$speedhash;",
        ];
        this.stateshaped = 1;
        // prep arrays for other styles
        var v = style.$statelist, i, l;
        for(i = 0, l = v.length;i<l;i++){
            s[s.length]="_sl["+i+"].length=0;";
        }
        return s.join('');
    },
    
    statedraw:function(x,y,w,h,state,time) {
        if(state && this.stateshaped)
            return [
                "_x1=",x,",_y1=",y,",_x2=",w,",_y2=",h,";",
                "if((_t=",state,")&0x36EC0000){",
                    "if((t=(n-",time,")*_sp[_t])>1){",
                        "_t=",state,"=_st[_t],",time,"=n,t=0;",
                    "}",
                "}",/*
                do{
                    _p = _sh[_t];
                    switch(_p.id){
                        case 0:
                         
                        break;
                        case 1:

                        break;
                    }
                    if(!(_t.base))break;
                    id = _t.base.id;
                }while(1);*/
            ].join('');
            
        switch(this.style.shape){
            default:
            case 'rect': return this.rect( x,y,w,h ); break;
        }
    },
    $stateEnd :function(){
        this.stateshaped = 0;
        var style = this.style, s = [this.$endDraw()];
        
        var v = style.$statelist, i, l;
        for(i = 0, l = v.length;i<l;i++){
            s[s.length]=[
              "if((_st=(_sh=_sl["+i+"]).length)>0){",
                  "t = _sh[0];",
                  this.shape( v[i], this.sml,this.smt,this.smr,this.smb,1 ),
                  this.$endDraw(),
              "}"].join('');
        }
        return s.join('');
    },
    
    // drawing command
    moveTo : function(x, y){
        return ["_p.push('m',__round(",x,")",
               ",' ',__round(",y+"),'l');\n"].join('');
    },
    lineTo : function(x, y){
        return ["_p.push(__round(",x,")",
               ",' ',__round("+y+"));\n"].join('');
    },
    hline : function(x,y,w){
        return ["_p.push('m',__round(",x,")",
                ",' ',__round(",y,")",
                ",'r',__round(",w,"),' 0');"].join('');
    },
    dot : function(x,y){
        return ["_p.push('m',__round(",x,")",
                ",' ',__round(",y,")",
                ",'r0 0');"].join('');
    },
    vline : function(x,y,h){
        return ["_p.push('m',__round(",x,")",
                ",' ',__round(",y,")",
                ",'r0 ',__round(",h,"));"].join('');
    },
    rect : function( x,y,w,h,inv ){
    /*
        if(this.style.outx){
            var ox = this.style.weight*this.style.outx;
            x=((parseFloat(x)==x)?(parseFloat(x)-ox):"("+x+"-"+ox+")");
            w=((parseFloat(w)==w)?(parseFloat(w)+2*ox):"("+w+"+"+2*ox+")");
        }
        if(this.style.outy){
            var oy = this.style.weight*this.style.outy;
            y=((parseFloat(y)==y)?(parseFloat(y)-oy):"("+y+"-"+oy+")");
            h=((parseFloat(h)==h)?(parseFloat(h)+2*oy):"("+h+"+"+2*oy+")");
        }
        */
        return ["_u=",x,";if((_t=__round(",w,"))>0)_p.push('m',__round(_u),' ',__round(",y,")",
                ",'r',_t,' 0r0 ',__round(",h,
                inv?"),'r-'+_t,' 0x');":"),'r-'+_t,' 0xe');"].join('');
    },
    rectInv : function( x,y,w,h ){
        return this.rect(x,y,w,h,1);
    },
    close : function (){
        return "_p.push('xe');";
    },
        
    $finalizeShape : function(style){
        return ["if((_s=_styles[",style._id,"])._pathstr!=(_t=",
            "(_p=_s._path).length?_p.join(' '):'m'))_s._vmlnode.path=_t;\n"].join('');
    },
    
    $endDraw : function() {
        if(this.stateshaped){
            return this.$stateEnd();
        }    
        if(this.style){
            var style = this.style, id = style._id, t;
            this.last = id;
            this.style = 0;
            if(style.isfont) return "_s._txtcount = _tc;\n";
        }
        return "\n";
    }
}
//#endif
//#endif