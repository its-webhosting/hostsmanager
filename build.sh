#!/bin/bash
echo "Generating Builds..."
neu build
echo "Setting Permissons..."
chmod +x ./bootstrapper
chmod +x ./dist/hostsmanager/*
mkdir -p prod
rm -rf prod/*
for filename in ./dist/hostsmanager/*; do
    echo "Processing $filename file..."
    filename=$(basename -- "$filename")
    filename="${filename%.*}"
    mkdir -p "prod/$filename"
    if [[ $filename == *"mac"* ]]; then
        mkdir -p "prod/$filename/HostsManager.app"
        mkdir -p "prod/$filename/HostsManager.app/Contents"
        mkdir -p "prod/$filename/HostsManager.app/Contents/MacOS"
        mkdir -p "prod/$filename/HostsManager.app/Contents/Resources"
        cp info.plist "prod/$filename/HostsManager.app/Contents/"
        cp "dist/hostsmanager/$filename" "prod/$filename/HostsManager.app/Contents/MacOS/main"
        cp "./bootstrapper" "prod/$filename/HostsManager.app/Contents/MacOS/bootstrap"
        cp dist/hostsmanager/resources.neu "prod/$filename/HostsManager.app/Contents/Resources/resources.neu"
        cp resources/icons/icon.icns "prod/$filename/HostsManager.app/Contents/Resources/icon.icns"
        create-dmg prod/$filename/HostsManager.app prod/$filename
    elif [[ $filename == *"win"* ]]; then
        cp "dist/hostsmanager/$filename.exe" "prod/$filename/hostsmanager.exe"
        cp dist/hostsmanager/resources.neu "prod/$filename/resources.neu"
    elif [[ $filename == *"linux"* ]]; then
        cp "dist/hostsmanager/$filename" "prod/$filename/hostsmanager"
        cp dist/hostsmanager/resources.neu "prod/$filename/resources.neu"
    fi
done