'use strict';
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

function hashFile(filePath, cb) {
    var fd = fs.createReadStream(filePath);
    var hash = crypto.createHash('sha1');
    hash.setEncoding('hex');
    fd.on('end', function() {
        hash.end();
        cb(hash.read());
    });
    fd.pipe(hash);
};

module.exports = function(app, astah, projectDir, exportDir) {
    function findFiles(hash) {
        return fs.readdirSync(path.join(exportDir, hash))
            .filter(function(filename) {
                return path.extname(filename) !== '.bak';
            })
            .map(function(filename) {
                return {
                    url: '/projects/' + hash + '?file=' + filename,
                    filename: filename
                };
        });
    }

    app.post('/projects', function(req, res) {
        var projectFile = req.files.project;
        hashFile(projectFile.path, function(hash) {
            var projectPath = path.join(projectDir,
                                        hash + '.' + projectFile.extension);
            fs.renameSync(projectFile.path, projectPath);
            astah.exportImage(projectPath, exportDir, 'png').then(function() {
                res.status(201);
                res.location('/projects/' + hash);
                res.send({
                    url: '/projects/' + hash,
                    exports: findFiles(hash)
                });
            }, function(err) {
                res.status(500);
                res.send(err);
            });
        });
    });

    app.get('/projects/:sha', function(req, res) {
        if(req.query.file) {
            var exportPath = path.join(exportDir, req.params.sha, req.query.file);
            if(fs.existsSync(exportPath)) {
                return res.sendFile(exportPath);
            } else {
                res.status(404),
                res.send('Could not find file ' + req.query.file);
            }
        } else {
            res.status(200);
            res.send({
                url: '/projects/' + req.params.sha,
                exports: findFiles(req.params.sha)
            });
        }
    });
};
