/*
 * This is ext-doc sample javascript file
 */

Ext.namespace("SamplePackage");

/**
 * @class SamplePackage.SampleClass
 * @extends Ext.Panel
 * This is a sample class <br/>
 * UTF-8 Check: Проверка поддержки тест utf-8 <br/>
 * {@link SamplePackage.SampleClass#methodOne this is method one} <br/>
 * {@link SamplePackage.SampleClass#methodOne} <br/>
 * {@link #methodOne another link} <br/>
 * {@link #methodOne} <br/>
 * {@link SamplePackage.SampleClass} <br/>
 * {@link SamplePackage.SampleClass sample class} <br/>
 * @author oxymoron
 * @version 1.0.101
 * @demo test
 * @brick brick-icon
 */
SamplePackage.SampleClass = Ext.extend(Ext.Panel, {

    /**
     * @cfg {String} configOne This is the config option
     */

    /**
     * @cfg Number configTwo     
     * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce fringilla
     * varius erat. Mauris bibendum. Sed pellentesque libero id mi.
     * Cras in lacus vel ipsum ultrices dapibus. Nulla ac odio.
     * Phasellus vel augue vitae ligula suscipit tincidunt.
     * Pellentesque dictum sodales magna. Sed accumsan.
     * Morbi congue sapien dapibus lectus.
     * Etiam feugiat tellus vulputate magna.
     */
    configTwo : 10,

    /**
     * This is a property
     */
    propertyOne: "PropertyOne",

    /**
     * This is a property with type
     * @type {Number}
     */
    propertyTwo: "PropertyTwo",

    /**
     * This is a method declaration
     * @author oxymoron
     */
    methodOne : function(){},

    // private
    privateFunction: function(){

        /**
         * This is a method declaration
         * @param {String} param1 Parameter name
         * @param {String} param2 (Optional) Optional parameter
         * @return {Number} Return value
         * @author oxymoron
         * @version 1.0
         */
        this.methodTwo = function(){};

        /**
         * This is a method declaration with specified method name
         * @method methodThree
         * @author user
         * @version 1.1
         */
        var mThree = function(){};
        this.methodThree = mThree;

        this.addEvents(
            /**
             * @event eventOne Event declaration
             */
            'eventOne',
            /**
             * @event eventTwo Event with parameters
             * @param {String} param1 Parameter name
             * @param {String} param2 Parameter name
             */
            'eventTwo'
        );

    }



});

/**
 * @class SamplePackage.Singleton
 * @singleton
 */
SamplePackage.Singleton = function(){};