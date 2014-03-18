
var _ = require('underscore');
var path = require('path');
var shell = require('shelljs');
var util = require('util');

var CoreUtil = require('oae-release-tools').CoreUtil;
var PackageUtil = require('oae-release-tools').PackageUtil;
var UploadUtil = require('oae-release-tools').UploadUtil;

// Load the release configuration
var release = require('./release');

CoreUtil.logInfo('Cloning etherpad-lite');
//CoreUtil.exec(util.format('git clone https://github.com/%s %s', release.etherpad.source.repo, release.cloneDir), 'Error cloning etherpad');
CoreUtil.exec(util.format('git clone file:///tmp/etherpad-lite %s', release.cloneDir), 'Error cloning etherpad');
shell.cd(release.cloneDir);

// Checkout the desired branch
CoreUtil.exec(util.format('git checkout %s', release.etherpad.source.branch), 'Error switching to etherpad branch');

// Ensure we can safely package and upload the etherpad release
PackageUtil.validatePackage(release.distDir);
CoreUtil.exec(util.format('mkdir -p %s', release.distDir), util.format('Error creating distribution directory %s', path.join(release.cloneDir, release.distDir)));

// Perform the etherpad installation
installEtherpad(release);

// Copy the Etherpad release files to the distribution directory
var srcDir = copyEtherpadReleaseFiles(release).srcDir;

// Get the version we're packaging
var systemInfo = CoreUtil.getSystemInfo();
var etherpadVersion = CoreUtil.gitVersion();
CoreUtil.logSuccess('Resolved version version to be '.text + etherpadVersion.white);

// Save the system/version information file
PackageUtil.saveBuildInfo(srcDir, etherpadVersion, systemInfo);

// Package the etherpad directory into a tarball
var packageFilename = util.format('etherpad-%s_node-%s', etherpadVersion, systemInfo.nodeVersion);
var packageResult = PackageUtil.packageRelease(srcDir, release.distDir, packageFilename);
var checksumResult = PackageUtil.checksumPackage(packageResult.packagePath);

UploadUtil.validateUpload(packageResult.packagePath, checksumResult.checksumPath);
UploadUtil.upload('oae-releases', 'us-east-1', 'etherpad', packageResult.packagePath, checksumResult.checksumPath, function(err) {
    if (err) {
        CoreUtil.logFail('Error uploading release artifacts to Amazon S3');
        if (err instanceof Error) {
            // It's a Node.js error object with a stack trace
            CoreUtil.logFail(err.stack);
        } else {
            // It's an AmazonS3 error message
            CoreUtil.logFail(JSON.stringify(err, null, 2));
        }

        return process.exit(11);
    }

    CoreUtil.logSuccess('Successfully uploaded release artifacts to Amazon S3');
});

/*!
 * Install etherpad in the release directory. When completed, the process
 * working directory will be in the etherpad root directory.
 */
function installEtherpad(release) {
    // Install etherpad dependencies
    CoreUtil.logInfo('Installing etherpad dependencies');
    CoreUtil.exec('bin/installDeps.sh', 'Error installing etherpad dependencies');

    // Install each plugin
    _.each(release.plugins, function(pluginInfo, pluginName) {
        CoreUtil.logInfo(util.format('Installing etherpad plugin: %s', pluginName.white));
        var npmPackage = pluginInfo.source.repo;
        if (pluginInfo.source.branch) {
            npmPackage += util.format('#%s', pluginInfo.source.branch);
        }

        CoreUtil.exec(util.format('npm install %s', npmPackage), util.format('Error installing plugin: %s', pluginName));
    });

    return {'srcDir': shell.pwd()};
}

/*!
 * Copy the etherpad release files to the distribution directory
 */
function copyEtherpadReleaseFiles(release) {
    var srcDir = util.format('%s/src', release.distDir);
    CoreUtil.exec(util.format('mkdir %s', srcDir));

    CoreUtil.exec(util.format('cp -RLf bin %s/bin', srcDir));
    CoreUtil.exec(util.format('cp -RLf node_modules %s/node_modules', srcDir));
    CoreUtil.exec(util.format('cp -RLf src %s/src', srcDir));

    return {'srcDir': srcDir};
}
