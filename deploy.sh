#!/bin/bash
pm2 delete --silent xcard
cd /var/www/
sudo rm -rf /var/www/xcard || true
git clone --single-branch --branch main git@github.com:acutecode2/xcard-API.git xcard 
sudo chmod -R 777 xcard/ 
cd xcard 
npm i 
pm2 start --name=xcard npm -- start -i max