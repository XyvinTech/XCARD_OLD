#!/bin/bash

echo "🔥🔥🔥  Starting Deployment  🔥🔥🔥"

cd ~ 

echo "✅ ✅ ✅  SSH Connection Established ✅ ✅ ✅"

ssh ubuntu@45.118.161.254 "pm2 delete --silent xcard && cd /var/www/ && sudo rm -rf xcard && sudo git clone --single-branch --branch main https://niyasmhdth:Nyz%401997@gitlab.com/girishprasad.ks/service-book.git xcard && sudo chmod -R 777 xcard/ && cd xcard && npm i && pm2 start --name=xcard npm -- start -i max"

echo "🚀🚀🚀  Incuse Deployed  🚀🚀🚀 "