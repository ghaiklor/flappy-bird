(function() {
    var GameInitialize = function GameInitialize() {
        ///////////////////
        //GAME CONSTANTS //
        ///////////////////
        var DEBUG_MODE = false,
            SPEED = 180,
            GRAVITY = 1800,
            BIRD_FLAP = 550,
            PIPE_SPAWN_INTERVAL = 2000,
            AVAILABLE_SPACE_BETWEEN_PIPES = 150,
            CLOUDS_SHOW_MIN_TIME = 5000,
            CLOUDS_SHOW_MAX_TIME = 10000,
            MAX_DIFFICULT = 50,
            SCENE = '',
            TITLE_TEXT = "FLAPPY BIRD",
            INSTRUCTIONS_TEXT = "TOUCH\nTO\nFLY",
            INSTRUCTIONS_TEXT_GAME_OVER = "TOUCH\nFOR GO\nBACK",
            ABOUT_TEXT = "Developer\nEugene Obrezkov\nghaiklor@gmail.com\n\n\nGraphic\nDima Lezhenko",
            LOADING_TEXT = "LOADING...",
            WINDOW_WIDTH = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
            WINDOW_HEIGHT = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;

        /////////////////////////////////////////////
        //HELPER VARIABLES FOR SAVING GAME-OBJECTS //
        /////////////////////////////////////////////
        var Background,
            Clouds, CloudsTimer,
            Pipes, PipesTimer, FreeSpacesInPipes,
            Bird,
            Fence,
            FlapSound, ScoreSound, HurtSound,
            TitleText, AboutText, ScoreText, InstructionsText, HighScoreText, LoadingText;

        //////////////////////////////////
        //VARIABLES FOR GAME-MANAGEMENT //
        //////////////////////////////////
        var gameScore = 0;

        ////////////////////////////////////////////
        //State - BootGame (Loading text appears) //
        ////////////////////////////////////////////
        var BootGameState = new Phaser.State();

        BootGameState.create = function() {
            LoadingText = Game.add.text(Game.world.width / 2, Game.world.height / 2, LOADING_TEXT, {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            LoadingText.anchor.setTo(0.5, 0.5);

            Game.state.start('Preloader', false, false);
        };

        /////////////////////////////////////
        //State - Preloader (Loading Assets) //
        /////////////////////////////////////
        var PreloaderGameState = new Phaser.State();

        PreloaderGameState.preload = function() {
            loadAssets();
        };

        PreloaderGameState.create = function() {
            createBackground();
            createRain();
            createClouds();
            createPipes(false);
            createFence();
            createBird();
            createTexts();
            createSounds();

            var tween = Game.add.tween(LoadingText).to({
                alpha: 0
            }, 1000, Phaser.Easing.Linear.None, true);

            tween.onComplete.add(function() {
                Game.state.start('MainMenu', false, false);
            }, this);
        };

        //////////////////////
        //State - Main Menu //
        //////////////////////
        var MainMenuState = new Phaser.State();

        MainMenuState.create = function() {
            gameScore = 0;

            Bird.angle = 0;
            Bird.body.allowGravity = false;
            Bird.reset(Game.world.width / 10, Game.world.height / 2);
            Bird.animations.play('flying');

            AboutText.setText(ABOUT_TEXT);
            TitleText.setText(TITLE_TEXT);
            InstructionsText.setText(INSTRUCTIONS_TEXT);
            ScoreText.setText("");
            HighScoreText.setText("");

            Game.input.onDown.addOnce(function() {
                birdFlap();
                Game.state.start('Game', false, false);
            });

            Pipes.removeAll();
            FreeSpacesInPipes.removeAll();
        };

        MainMenuState.update = function() {
            Bird.y = (Game.world.height / 2) + 32 * Math.cos(Game.time.now / 1000);
            Bird.x = (Game.world.width / 10) + 32 * Math.sin(Game.time.now / 3000);

            Clouds.forEachAlive(function(cloud) {
                if (cloud.x + cloud.width < Game.world.bounds.left) {
                    cloud.kill();
                }
            });

            // TitleText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
            // InstructionsText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
            Fence.tilePosition.x -= Game.time.physicsElapsed * SPEED / 2;
            TitleText.angle = 5 * Math.cos(Game.time.now / 100);
        };

        /////////////////////////////////////
        //Game state - Where game is going //
        /////////////////////////////////////
        var GameState = new Phaser.State();

        GameState.create = function() {
            createPipes(true);

            AboutText.setText("");
            TitleText.setText("");
            InstructionsText.setText("");
            HighScoreText.setText("");
            ScoreText.setText(gameScore);

            Bird.body.allowGravity = true;

            Game.input.onDown.add(birdFlap);
        };

        GameState.update = function() {
            Bird.angle = (90 * (BIRD_FLAP + Bird.body.velocity.y) / BIRD_FLAP) - 180;
            if (Bird.angle < -30) {
                Bird.angle = -30;
            } else if (Bird.angle > 30) {
                Bird.angle = 30;
            }

            if (Bird.body.bottom >= Game.world.bounds.bottom - 32 || Bird.body.top <= Game.world.bounds.top) {
                Game.state.start('GameOver', false, false);
            }

            Game.physics.overlap(Bird, Pipes, function() {
                Game.state.start('GameOver', false, false);
            });

            Game.physics.overlap(Bird, FreeSpacesInPipes, addScore);

            Clouds.forEachAlive(function(cloud) {
                if (cloud.x + cloud.width < Game.world.bounds.left) {
                    cloud.kill();
                }
            });

            Pipes.forEachAlive(function(pipe) {
                if (pipe.x + pipe.width < Game.world.bounds.left) {
                    pipe.kill();
                }
            });

            Fence.tilePosition.x -= Game.time.physicsElapsed * SPEED / 2;
            ScoreText.angle = 10 * Math.sin(Game.time.now / 100);
        };

        GameState.render = function() {
            if (DEBUG_MODE) {
                Game.debug.renderCameraInfo(Game.camera, 32, 32);
                Game.debug.renderSpriteBody(Bird);
                Game.debug.renderSpriteBounds(Bird);
                Game.debug.renderSpriteCorners(Bird, true, true);

                Game.debug.renderQuadTree(Game.physics.quadTree);

                Pipes.forEachAlive(function(pipe) {
                    Game.debug.renderSpriteBody(pipe);
                    Game.debug.renderSpriteCorners(pipe, true, true);
                });

                FreeSpacesInPipes.forEachAlive(function(spaceInPipe) {
                    Game.debug.renderSpriteBody(spaceInPipe);
                });
            }
        };

        //////////////////////////////////
        //State which show on Game Over //
        //////////////////////////////////
        var GameOverState = new Phaser.State();

        GameOverState.create = function() {
            Game.input.onDown.remove(birdFlap);

            HurtSound.play();

            Pipes.forEachAlive(function(pipe) {
                pipe.body.velocity.x = 0;
            });

            FreeSpacesInPipes.forEachAlive(function(spaceInPipe) {
                spaceInPipe.body.velocity.x = 0;
            });

            PipesTimer.stop();

            AboutText.setText("");
            TitleText.setText("");
            ScoreText.setText("");
            InstructionsText.setText("");
            HighScoreText.setText("HIGHSCORE: " + getHighscore(gameScore) + "\n\nYOUR SCORE: " + gameScore);

            Bird.angle = 180;
            Bird.animations.stop();
            Bird.frame = 3;

            setTimeout(function() {
                InstructionsText.setText(INSTRUCTIONS_TEXT_GAME_OVER);
                Game.input.onDown.addOnce(function() {
                    Game.state.start('MainMenu', false, false);
                });
            }, 2000);
        };

        GameOverState.update = function() {
            HighScoreText.angle = 5 * Math.cos(Game.time.now / 100);
        };

        ///////////////////
        //Make bird flap //
        ///////////////////
        var birdFlap = function birdFlap() {
            Bird.body.velocity.y = -BIRD_FLAP;
            FlapSound.play();
        };

        ////////////////////////////////////
        // Add score to current gameScore //
        ////////////////////////////////////
        var addScore = function addScore(_, spaceInPipe) {
            FreeSpacesInPipes.remove(spaceInPipe);
            ++gameScore;
            ScoreText.setText(gameScore);
            ScoreSound.play();
        };

        ///////////////////
        // Get highscore //
        ///////////////////
        var getHighscore = function getHighscore(score) {
            var highscore = window.localStorage.getItem('highscore');
            if (score > highscore || highscore === null) {
                highscore = score;
                window.localStorage.setItem('highscore', highscore);
            }

            return highscore;
        };

        ////////////////////////
        //Load assets in game //
        ////////////////////////
        var loadAssets = function loadAssets() {
            Game.load.spritesheet('bird', 'img/bird.png', 48, 35);
            Game.load.spritesheet('clouds', 'img/clouds.png', 128, 64);
            Game.load.spritesheet('rain', 'img/rain.png', 17, 17);

            Game.load.image('fence', 'img/fence.png');
            Game.load.image('pipe', 'img/pipe.png');

            Game.load.audio('flap', 'wav/flap.wav');
            Game.load.audio('hurt', 'wav/hurt.wav');
            Game.load.audio('score', 'wav/score.wav');
        };

        //////////////////////
        //Create background //
        //////////////////////
        var createBackground = function createBackground() {
            Background = Game.add.graphics(0, 0);
            Background.beginFill(0x4E5B61, 1);
            Background.drawRect(0, 0, Game.world.width, Game.world.height);
            Background.endFill();
        };

        ////////////////
        //Create Rain //
        ////////////////
        var createRain = function createRain() {
            var emitter = Game.add.emitter(Game.world.centerX, 0, 400);
            emitter.width = Game.world.width;
            emitter.angle = 0;
            emitter.makeParticles('rain');
            emitter.maxParticleScale = 0.5;
            emitter.minParticleScale = 0.1;
            emitter.setYSpeed(300, 500);
            emitter.setXSpeed(-5, 5);
            emitter.minRotation = 0;
            emitter.maxRotation = 0;
            emitter.gravity = GRAVITY;
            emitter.start(false, 1600, 5, 0);
        };

        //////////////////
        //Create clouds //
        //////////////////
        var createClouds = function createClouds() {
            function makeNewCloud() {
                var cloudY = Math.random() * Game.world.height / 2,
                    cloud = Clouds.create(Game.world.width, cloudY, 'clouds', Math.floor(4 * Math.random())),
                    cloudScale = 1 + Math.floor((3 * Math.random()));

                cloud.alpha = 2 / cloudScale;
                cloud.scale.setTo(cloudScale, cloudScale);
                cloud.body.allowGravity = false;
                cloud.body.velocity.x = -SPEED / cloudScale;
                cloud.anchor.setTo(0, 0.5);

                CloudsTimer.add(Game.rnd.integerInRange(CLOUDS_SHOW_MIN_TIME, CLOUDS_SHOW_MAX_TIME), makeNewCloud, this);
            }
            Clouds = Game.add.group();
            CloudsTimer = Game.time.create(false);
            CloudsTimer.add(0, makeNewCloud, this);
            CloudsTimer.start();
        };

        /////////////////
        //Create Fence //
        /////////////////
        var createFence = function createFence() {
            Fence = Game.add.tileSprite(0, Game.world.height - 32, Game.world.width, 32, 'fence');
            Fence.tileScale.setTo(2, 2);
        };

        ////////////////
        //Create bird //
        ////////////////
        var createBird = function createBird() {
            Bird = Game.add.sprite(0, 0, 'bird');
            Bird.anchor.setTo(0.5, 0.5);
            Bird.animations.add('flying', [0, 1, 2, 3, 2, 1, 0], 20, true);
            Bird.animations.play('flying');
            Bird.body.collideWorldBounds = true;
            Bird.body.gravity.y = GRAVITY;
            Bird.body.allowGravity = false;
        };

        //////////////////
        //Create Pipes //
        //////////////////
        var createPipes = function createPipes(timer) {
            function calcDifficult() {
                return AVAILABLE_SPACE_BETWEEN_PIPES + 60 * ((gameScore > MAX_DIFFICULT ? MAX_DIFFICULT : MAX_DIFFICULT - gameScore) / MAX_DIFFICULT);
            }

            function makeNewPipe(pipeY, isFlipped) {
                var pipe = Pipes.create(Game.world.width, pipeY + (isFlipped ? -calcDifficult() : calcDifficult()) / 2, 'pipe');

                pipe.body.allowGravity = false;
                pipe.scale.setTo(2, isFlipped ? -2 : 2);
                pipe.body.offset.y = isFlipped ? -pipe.body.height * 2 : 0;
                pipe.body.velocity.x = -SPEED;
                return pipe;
            }

            function makePipes() {
                var pipeY = ((Game.world.height - 16 - calcDifficult() / 2) / 2) + (Math.random() > 0.5 ? -1 : 1) * Math.random() * Game.world.height / 6,
                    bottomPipe = makeNewPipe(pipeY),
                    topPipe = makeNewPipe(pipeY, true),
                    spaceInPipe = FreeSpacesInPipes.create(topPipe.x + topPipe.width, 0);

                spaceInPipe.width = 2;
                spaceInPipe.height = Game.world.height;
                spaceInPipe.body.allowGravity = false;
                spaceInPipe.body.velocity.x = -SPEED;

                PipesTimer.add(PIPE_SPAWN_INTERVAL, makePipes, this);
            }

            if (timer) {
                PipesTimer = Game.time.create(false);
                PipesTimer.add(PIPE_SPAWN_INTERVAL, makePipes, this);
                PipesTimer.start();
            } else {
                Pipes = Game.add.group();
                FreeSpacesInPipes = Game.add.group();
            }
        };

        /////////////////
        //Create Texts //
        /////////////////
        var createTexts = function createTexts() {
            TitleText = Game.add.text(Game.world.width / 2, Game.world.height / 3, TITLE_TEXT, {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            TitleText.anchor.setTo(0.5, 0.5);
            TitleText.angle = 5;

            AboutText = Game.add.text(Game.world.width - 10, 10, ABOUT_TEXT, {
                font: '13px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            AboutText.anchor.x = 1;

            InstructionsText = Game.add.text(Game.world.width / 2, Game.world.height - Game.world.height / 3, INSTRUCTIONS_TEXT, {
                font: '16px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            InstructionsText.anchor.setTo(0.5, 0.5);

            ScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "", {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            ScoreText.anchor.setTo(0.5, 0.5);

            HighScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 3, "", {
                font: '24px "Press Start 2P"',
                fill: '#fff',
                stroke: '#430',
                strokeThickness: 8,
                align: 'center'
            });
            HighScoreText.anchor.setTo(0.5, 0.5);
        };

        //////////////////
        //Create Sounds //
        //////////////////
        var createSounds = function createSounds() {
            FlapSound = Game.add.audio('flap');
            ScoreSound = Game.add.audio('score');
            HurtSound = Game.add.audio('hurt');
        };

        //////////////
        //INIT CORE //
        //////////////
        var Game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, SCENE);
        Game.state.add('Boot', BootGameState, false);
        Game.state.add('Preloader', PreloaderGameState, false);
        Game.state.add('MainMenu', MainMenuState, false);
        Game.state.add('Game', GameState, false);
        Game.state.add('GameOver', GameOverState, false);

        Game.state.start('Boot');
    };


    WebFont.load({
        google: {
            families: ['Press+Start+2P']
        },
        active: function() {
            GameInitialize();
        }
    });
})();