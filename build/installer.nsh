!macro customInstall
  IfFileExists "$INSTDIR\vc_redist.x64.exe" 0 +3
    ExecWait '"$INSTDIR\vc_redist.x64.exe" /install /passive /norestart'
!macroend
