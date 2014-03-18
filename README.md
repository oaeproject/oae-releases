oae-releases
============

Repository for performing releases of OAE and dependency packages.

## Etherpad

This utility takes care of packaging up an etherpad release and uploading it to Amazon S3. To build an etherpad release package, follow these steps:

1. Set the following environment variables to a user who has access to the `oae-releases` Amazon S3 bucket:

```
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

These variables are used to authenticate to Amazon S3 to upload the release.

2. Update the `etherpad/release.json` file to specify the desired release parameters. You can specify:

    a. The etherpad **git** repository and branch information. If etherpad-lite has been forked for some reason, you can point it to the new repository.
    b. The plugins you wish to install and their **npm** reference information. This can also be a git references using npm's support for git (e.g., `oaeproject/ep_oae`)

3. CD into the etherpad directory and invoke `etherpad.js`: 

```
$ cd etherpad
$ node etherpad.js
```

This will follow the process:

1. Clone etherpad
2. Run `installDeps.sh`
3. `npm install` all the specified plugins
4. Tarring the finished package
5. Performing a sha1sum of the release package
6. Uploading the tar.gz and checksum to Amazon S3
