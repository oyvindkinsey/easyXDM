/*jslint evil: true */
/**
 * easyXDM
 * http://easyxdm.net/
 * Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * This just aggregates all the separate files
 */
(function(){
    var scripts = document.getElementsByTagName("script"), src = scripts[scripts.length - 1].src.replace("easyXDM.debug.js", "");
    
    document.write(unescape("%3Cscript src='" + src + "Core.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Debug.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "DomHelper.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Fn.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Socket.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "Rpc.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/FlashTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/SameOriginTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/PostMessageTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/FrameElementTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/NameTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/HashTransport.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/ReliableBehavior.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/QueueBehavior.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/VerifyBehavior.js' type='text/javascript'%3E%3C/script%3E"));
    document.write(unescape("%3Cscript src='" + src + "stack/RpcBehavior.js' type='text/javascript'%3E%3C/script%3E"));
}());
