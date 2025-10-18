#!/bin/bash

echo "Testing DNS and WHOIS tools output..."

DOMAIN="google.com"
TIMESTAMP=$(date +%s)

echo "Testing WHOIS..."
whois $DOMAIN > test_whois_${DOMAIN}_${TIMESTAMP}.txt 2>&1
echo "WHOIS output saved to: test_whois_${DOMAIN}_${TIMESTAMP}.txt"

echo "Testing DIG..."
echo "=== DIG DNS Records for $DOMAIN ===" > test_dig_${DOMAIN}_${TIMESTAMP}.txt
echo "" >> test_dig_${DOMAIN}_${TIMESTAMP}.txt
echo "A Records:" >> test_dig_${DOMAIN}_${TIMESTAMP}.txt
dig $DOMAIN A +short >> test_dig_${DOMAIN}_${TIMESTAMP}.txt
echo "" >> test_dig_${DOMAIN}_${TIMESTAMP}.txt
echo "NS Records:" >> test_dig_${DOMAIN}_${TIMESTAMP}.txt
dig $DOMAIN NS +short >> test_dig_${DOMAIN}_${TIMESTAMP}.txt
echo "DIG output saved to: test_dig_${DOMAIN}_${TIMESTAMP}.txt"

echo "Testing NSLOOKUP..."
echo "=== NSLOOKUP DNS Records for $DOMAIN ===" > test_nslookup_${DOMAIN}_${TIMESTAMP}.txt
nslookup $DOMAIN >> test_nslookup_${DOMAIN}_${TIMESTAMP}.txt 2>&1
echo "NSLOOKUP output saved to: test_nslookup_${DOMAIN}_${TIMESTAMP}.txt"

echo "Testing HOST..."
echo "=== HOST DNS Records for $DOMAIN ===" > test_host_${DOMAIN}_${TIMESTAMP}.txt
host $DOMAIN >> test_host_${DOMAIN}_${TIMESTAMP}.txt 2>&1
echo "HOST output saved to: test_host_${DOMAIN}_${TIMESTAMP}.txt"

echo "All tests completed! Check the generated files."
