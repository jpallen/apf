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
// #ifdef __JVIDEO || __INC_ALL

/**
 * Component displaying a Flash video
 *
 * @classDescription This class creates a new Flash video player
 * @return {TypeFlv} Returns a new Flash video player
 * @type {TypeFlv}
 * @constructor
 * @addnode components:video
 *
 * @author      Mike de Boer
 * @version     %I%, %G%
 * @since       1.0
 */
jpf.video.TypeFlv = function(oVideo, node, options) {
    this.oVideo              = oVideo;
    this.DEFAULT_SWF_PATH    = jpf.basePath + "elements/video/FAVideo.swf"; // dot swf is added by AC_RunActiveContent
    this.DEFAULT_SKIN_PATH   = jpf.basePath + "elements/video/ClearOverPlayMute.swf";
    this.DEFAULT_WIDTH       = 320;
    this.DEFAULT_HEIGHT      = 240;
    
    this.id = jpf.flash.addPlayer(this); // Manager manages multiple players
    this.inited = false;
    
    // Div name, flash name, and container name
    this.divName      = this.oVideo.uniqueId;
    this.htmlElement  = node;
    this.name         = "FAVideo_" + this.oVideo.uniqueId;
    
    // Video props
    this.videoPath  = options.src;
    this.width      = (options.width  > 0) ? options.width  : this.DEFAULT_WIDTH;
    this.height     = (options.height > 0) ? options.height : this.DEFAULT_HEIGHT;
    
    // Initialize player
    this.player = null;
    jpf.extend(this, jpf.video.TypeInterface);

    this.initProperties().setOptions(options).createPlayer();
}

jpf.video.TypeFlv.isSupported = function() {
    return jpf.flash.isAvailable();
};

jpf.video.TypeFlv.prototype = {
    /**
     * Play an FLV. Does a call to the flash player to load or load & play the
     * video, depending on the 'autoPlay' flag (TRUE for play).
     * 
     * @param {String} videoPath Path to the FLV. If the videoPath is null, and the FLV is playing, it will act as a play/pause toggle.
     * @param {Number} totalTime Optional totalTime to override the FLV's built in totalTime
     * @type  {Object}
     */
    load: function(videoPath, totalTime) {
        if (totalTime != null)
            this.setTotalTime(totalTime);
        if (videoPath != null)
            this.videoPath = videoPath;
        if (this.videoPath == null && !this.firstLoad)
            return this.oVideo.$errorHook({type:"error", error:"FAVideo::play - No videoPath has been set."});

        if (videoPath == null && this.firstLoad && !this.autoLoad) // Allow play(null) to toggle playback 
            videoPath = this.videoPath;

        this.firstLoad = false;
        if (this.autoPlay)
            this.callMethod("playVideo", videoPath, totalTime);
        else
            this.callMethod("loadVideo", this.videoPath);
        return this;
    },
    
    /**
     * Play and/ or resume a video that has been loaded already
     * 
     * @type {Object}
     */
    play: function() {
        return this.pause(false);
    },
    
    /**
     * Toggle the pause state of the video.
     *
     * @param {Boolean} pauseState The pause state. Setting pause state to true will pause the video.
     * @type {Object}
     */
    pause: function(pauseState) {
        if (typeof pauseState == "undefined")
            pauseState = true;
        return this.callMethod("pause", pauseState);
    },
    
    /**
     * Stop playback of the video.
     * 
     * @type {Object}
     */
    stop: function() {
        return this.callMethod("stop");
    },
    
    /**
     * Seek the video to a specific position.
     *
     * @param {Number} seconds The number of seconds to seek the playhead to.
     * @type {Object}
     */
    seek: function(seconds) {
        return this.callMethod("seek", seconds);
    },
    
    /**
     * Not supported.
     * 
     * @type {Object}
     */
    setVolume: function() {
        return this;
    },
    
    /**
     * Set the size of the video.
     *
     * @param {Number} width The width of the video.
     * @param {Number} height The height of the video.
     * @type {Object}
     */	
    setSize: function(width, height) {
        this.width  = width;
        this.height = height;
        // Change the DOM.  Do not rerender.
        this.container.style.width  = this.width + "px";
        this.container.style.height = this.height + "px";
        return this.callMethod("setSize", this.width, this.height);
    },

    /**
     * Retrive the position of the playhead, in seconds.
     * 
     * @type {Number}
     */
    getPlayheadTime: function() {
        return this.playheadTime;
    },
    
    /**
     * Specifies the position of the playhead, in seconds.
     * 
     * @default null
     * @type {Object}
     */
    setPlayheadTime: function(value) {
        return this.setProperty("playheadTime", value);
    },
    
    /**
     * Retrieve the total playtime of the video, in seconds.
     * 
     * @type {Number}
     */
    getTotalTime: function() {
        return this.totalTime;
    },
    
    /**
     * Determines the total time of the video.  The total time is automatically determined
     * by the player, unless the user overrides it.
     * 
     * @default null
     * @type {Object}
     */
    setTotalTime: function(value) {
        return this.setProperty("totalTime", value);
    },
    
    /**
     * All public methods use this proxy to make sure that methods called before
     * initialization are properly called after the player is ready.
     * Supply three arguments maximum, because function.apply does not work on 
     * the flash object.
     * 
     * @param {String} param1
     * @param {String} param2
     * @param {String} param3
     * @type {Object}
     */  
    callMethod: function(param1, param2, param3) {
        if (this.inited)
            this.player.callMethod(param1, param2, param3); // function.apply does not work on the flash object
        else
            this.delayCalls.push(arguments);
        return this;
    },
    
    /**
     * Call methods that were made before the player was initialized.
     * 
     * @type {Object}
     */
    makeDelayCalls: function() {
        for (var i = 0; i < this.delayCalls.length; i++)
            this.callMethod.apply(this, this.delayCalls[i]);
        return this;
    },

    /**
     * Callback from flash; synchronizes the state of properties of the Flash
     * movie with the properties of the javascript object
     * 
     * @param {Object} props
     * @type {void}
     */
    update: function(props) {
        for (var n in props)
            this[n] = props[n]; // Set the internal property
        props.type = "change";
        this.oVideo.$changeHook(props); // This needs to have an array of changed props.
    },

    /**
     * Callback from flash; whenever the Flash movie bubbles an event up to the
     * javascript interface, it passes through to this function.
     * Events dispatched by FAVideo instances:
     *	> init: The player is initialized
     *	> ready: The video is ready
     *	> progress: The video is downloading. Properties: bytesLoaded, bytesTotal
     *	> playHeadUpdate: The video playhead has moved.  Properties: playheadTime, totalTime
     *	> stateChange: The state of the video has changed. Properties: state
     *	> change: The player has changed.
     *	> complete: Playback is complete.
     *	> metaData: The video has returned meta-data. Properties: infoObject
     *	> cuePoint: The video has passed a cuePoint. Properties: infoObject
     *	> error: An error has occurred.  Properties: error
     * 
     * @param {Object} eventName
     * @param {Object} evtObj
     * @type {void}
     */
    event: function(eventName, evtObj) {
        switch (eventName) {
            case "progress":
                this.bytesLoaded = evtObj.bytesLoaded;
                this.totalBytes  = evtObj.bytesTotal;
                this.oVideo.$progressHook({
                    type       : "progress",
                    bytesLoaded: this.bytesLoaded,
                    totalBytes : this.totalBytes
                });
                break;
            case "playheadUpdate":
                this.playheadTime = evtObj.playheadTime;
                this.totalTime    = evtObj.totalTime;
                this.oVideo.$playheadUpdateHook({
                    type        : "playheadUpdate",
                    playheadTime: this.playheadTime,
                    totalTime   : this.totalTime
                });
                break;
            case "stateChange":
                this.state = evtObj.state;
                this.oVideo.$stateChangeHook({type:"stateChange", state:this.state});
                break;
            case "change":
                this.oVideo.$changeHook({type:"change"});
                break;
            case "complete":
                this.oVideo.$completeHook({type:"complete"});
                break;
            case "ready":
                this.oVideo.$readyHook({type:"ready"});
                break;
            case "metaData":
                this.oVideo.$metadataHook({type:"metadata", infoObject:evtObj});
                break;
            case "cuePoint":
                this.oVideo.$cuePointHook({type:"cuePoint", infoObject:evtObj});
                break;
            case "init":
                this.inited = true;
                // There is a bug in IE innerHTML. Tell flash what size it is.
                // This will probably not work with liquid layouts in IE.
                this.callMethod("setSize", this.width, this.height)
                 .invalidateProperty("clickToTogglePlay", "skinVisible", 
                    "skinAutoHide", "autoPlay", "autoLoad", "volume", "bufferTime", 
                    "videoScaleMode", "videoAlign", "playheadUpdateInterval", 
                    "skinPath", "previewImagePath").validateNow().makeDelayCalls();

                this.oVideo.$initHook({type:"init"});
                break;
        }
    },
    
    /**
     * Mark out the properties, so they are initialized, and documented.
     * 
     * @type {Object}
     */
    initProperties: function() {
        this.delayCalls = [];
        
        // Properties set by flash player
        this.videoWidth = this.videoHeight = this.totalTime = this.bytesLoaded = this.totalBytes = 0;
        this.state = null;
        
        // Internal properties that match get/set methods
        this.clickToTogglePlay = this.autoPlay = this.autoLoad = this.skinVisible = true;
        this.volume                 = 50;
        this.skinVisible            = false;
        this.skinAutoHide           = false;
        this.skinPath               = this.DEFAULT_SKIN_PATH;
        this.playheadTime           = null;
        this.bufferTime             = 0.1;
        this.videoScaleMode         = "maintainAspectRatio"; // Also "noScale", "fitToWindow"
        this.videoAlign             = "center";
        this.playheadUpdateInterval = 1000;
        this.previewImagePath       = this.themeColor = null
        
        this.firstLoad   = true;
        this.pluginError = false;
        
        this.properties = ["volume", "skinAutoHide", "showControls", "autoPlay",
            "clickToTogglePlay", "autoLoad", "playHeadTime", "totalTime",
            "bufferTime", "videoScaleMode", "videoAlign", "playheadUpdateInterval",
            "skinPath", "previewImagePath"];
        
        return this;
    },
    
    /**
     * Create the HTML to render the player.
     * 
     * @type {Object}
     */
    createPlayer: function() {
        var flash = jpf.flash.buildContent(
            "src",              this.DEFAULT_SWF_PATH,
            "width",            "100%",
            "height",           "100%",
            "align",            "middle",
            "id",               this.name,
            "quality",          "high",
            "bgcolor",          "#000000",
            "allowFullScreen",  "true", 
            "name",             this.name,
            "flashvars",        "playerID=" + this.id,// + "&initialVideoPath=" + this.videoPath,
            "allowScriptAccess","always",
            "type",             "application/x-shockwave-flash",
            "pluginspage",      "http://www.adobe.com/go/getflashplayer",
            "menu",             "true");
        
        var content = "<div id='" + this.name + "_Container' class='jpfVideo'\
            style='width:" + this.width + "px;height:" + this.height + "px;'>"
            + flash + "</div>";
        
        var div = this.htmlElement || jpf.flash.getElement(this.divName);
        if (div == null) return this;

        this.pluginError = false;
        div.innerHTML = content;
        
        this.player    = jpf.flash.getElement(this.name);
        this.container = jpf.flash.getElement(this.name + "_Container");
        
        return this;
    },

    /**
     * Mark a property as invalid, and create a timeout for redraw
     * 
     * @type {Object}
     */
    invalidateProperty: function() {
        if (this.invalidProperties == null)
            this.invalidProperties = {};

        for (var i = 0; i < arguments.length; i++)
            this.invalidProperties[arguments[i]] = true;
        
        if (this.validateInterval == null && this.inited) {
            var _this = this;
            this.validateInterval = setTimeout(function() {
                _this.validateNow();
            }, 100);
        }
        
        return this;
    },
    
    /**
     * Updated player with properties marked as invalid.
     * 
     * @type {Object}
     */
    validateNow: function() {
        this.validateInterval = null;
        var props = {};
        for (var n in this.invalidProperties)
            props[n] = this[n];
        this.invalidProperties = {};
        this.player.callMethod("update", props);
        return this;
    },
    
    /**
     * All public properties use this proxy to minimize player updates
     * 
     * @param {String} property
     * @param {String} value
     * @type {Object}
     */
    setProperty: function(property, value) {
        this[property] = value; // Set the internal property
        if (this.inited)
            this.invalidateProperty(property); // Otherwise, it is already invalidated on init.
        return this;
    },
    
    $destroy: function() {
        if (this.player) {
            delete this.player;
            delete this.container;
            this.player = this.container = null;
        }
        delete this.oVideo;
        delete this.htmlElement;
        this.oVideo = this.htmlElement = null;
    }
};
// #endif
