# Traditional approach - must memorize exact syntax
$ myapp commit --message "fix bug" --files src/ --no-verify
$ myapp review --pr 123 --depth full --output json
$ myapp analyze --type complexity --threshold 10 --exclude tests/

# What users actually want to say
$ myapp "commit my changes with a good message"
$ myapp "review that PR we discussed"
$ myapp "check code complexity"