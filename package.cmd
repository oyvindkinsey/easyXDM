call tools\apache-ant-1.7.1\bin\ant
IF %ERRORLEVEL% == 0 java -jar tools\jsdoc_toolkit-2.3.0\jsdoc-toolkit\jsrun.jar tools\jsdoc_toolkit-2.3.0\jsdoc-toolkit\app\run.js -a -t=tools\jsdoc_toolkit-2.3.0\jsdoc-toolkit\templates/outline -x=js,html  -d=build\docs build\easyXSS.js build\hash.html
IF %ERRORLEVEL% == 0 call tools\apache-ant-1.7.1\bin\ant package

pause
