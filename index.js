'use strict'

const program = require('commander');
const bitbucket = require('bitbucket-rest');    
const { execSync } = require('child_process')
const fs = require('fs')

const args = {
	'user': 'required',
	'pass': 'required',
	'pubDir': null,
	'srcRepo': 'required',
	'vhost': null,
	'domainSuffix': null
}

program
	.version('0.0.1')
    .usage('[options] <projectName>')
    .option('-u, --user <username>', 'Bitbucket username (required if not in ~/.bibeer)')
    .option('-p, --pass <password>', 'Bitbucket password (required if not in ~/.bibeer)')
    .option('-d, --pubDir <dirname>', 'Project public directory name')
    .option('-s, --srcRepo <url>', 'Source repository url (required if not in ~/.bibeer)')
    .option('-h, --vhost <app>', 'Virtual host installer path')
    .option('-x, --domain-suffix <domainSuffix>', 'Virtual host domain suffix. (default: local)')
    .parse(process.argv);



if(!program.args.length) {
    program.help();
} 
else {


	var config = {}
	const bibeerConfigPath = require('os').homedir()  + '/.bibeer'

	if(fs.existsSync(bibeerConfigPath))
	{
		config = JSON.parse(fs.readFileSync(bibeerConfigPath));
	}
	else {
		console.log('[Warning] ~/.bibeer not exists you must specify user, pass, srcRepo by command line arguments')
	}

	config.name = program.args[0];

	let configErrors = false

	for (let arg in args)
	{
		
		if(typeof program[arg] != 'undefined') 
		{
			config[arg] = program[arg]
		}
		else if(args[arg] == 'required' && (typeof config[arg] === 'undefined' || !config[arg]))
		{
			console.log(`[Error] Argument '${arg}' is required.`)
			configErrors = true
		}
	}

	if(!configErrors)
	{
		var client = bitbucket.connectClient({username : config.user, password : config.pass});

		const repo = {
			owner: config.user,
			repo_slug: config.name,
			name: config.name,
		    scm: "git",
		    is_private: true,
		}

		let destUrl = `git@bitbucket.org:${config.user}/${config.name}.git`
		console.log(`Creating repository ${destUrl}...`);
		client.createRepo(repo, function(res){
			if(res.status == 200)
			{
				console.log(`Cloning ${config.srcRepo} to ${config.name}...`);
				execSync(`git clone ${config.srcRepo} ${config.name}`);
				console.log(`Changing remote origin to: ${destUrl}...`);
				execSync(`git remote set-url origin ${destUrl}`, {cwd: process.cwd() + `/${config.name}`});

				if(typeof config.pubDir !== 'undefined' && config.pubDir)
				{
					if(typeof config.vhost !== 'undefined' && config.vhost)
					{
						let domainSuffix = config.domainSuffix ? config.domainSuffix : 'local' 
						console.log(`Creating virtual host http://${config.name}.${domainSuffix}`);
						console.log(execSync(`${config.vhost} ${config.name}.${domainSuffix} ${config.pubDir}`, {cwd: process.cwd() + `/${config.name}`}).toString());
					}
					else
					{
						console.log(`[Warning] Virtual host config has been skipped because vhost config is missing`);
					}
				}
				else
				{
					console.log(`[Warning] Virtual host config has been skipped because pubDir config has not pass`);
				}
			}
			else if(res.status == 400)
			{
				console.log(`[Error] ${res.data.error.message}`)
			}
		})
	}
	else {
		console.log(`[Error] Program executing has been stoped because some required argumets are missing.`)
	}


	
}




