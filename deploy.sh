#!/bin/bash

echo "🔥🔥🔥  Starting Deployment  🔥🔥🔥"

cd ~ 

echo "✅ ✅ ✅  SSH Connection Established ✅ ✅ ✅"

ssh -o PasswordAuthentication=yes ubuntu@45.118.161.254 './deploy.sh'

echo "🚀🚀🚀  Xcard Deployed  🚀🚀🚀 "