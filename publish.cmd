call tools\apache-ant-1.7.1\bin\ant publish -Dproject.build.artifactdir=pub/
IF NOT %ERRORLEVEL% == 0 pause


