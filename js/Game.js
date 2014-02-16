(function() {
    var GameInitialize = function GameInitialize() {
        ///////////////////
        //GAME CONSTANTS //
        ///////////////////
        var DEBUG_MODE = false,
            SPEED = 180,
            GRAVITY = 1800,
            BIRD_FLAP = 550,
            PIPE_SPAWN_MIN_INTERVAL = 1000,
            PIPE_SPAWN_MAX_INTERVAL = 3000,
            AVAILABLE_SPACE_BETWEEN_PIPES = 120,
            CLOUDS_SHOW_MIN_TIME = 3000,
            CLOUDS_SHOW_MAX_TIME = 5000,
            MAX_DIFFICULT = 50,
            SCENE = '',
            TITLE_TEXT = "FLAPPY BIRD",
            HIGHSCORE_TITLE = "HIGHSCORES",
            HIGHSCORE_SUBMIT = "POST SCORE",
            INSTRUCTIONS_TEXT = "TOUCH\nTO\nFLY",
            BACK_TO_MENU_TEXT = "MAIN MENU",
            DEVELOPER_TEXT = "Developer\nEugene Obrezkov\nghaiklor@gmail.com",
            GRAPHIC_TEXT = "Graphic\nDmitry Lezhenko\ndima.lezhenko@gmail.com",
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
            Town,
            FlapSound, ScoreSound, HurtSound,
            TitleText, DeveloperText, GraphicText, ScoreText, InstructionsText, HighScoreTitleText, HighScoreText, PostScoreText, LoadingText,
            PostScoreClickArea,
            isScorePosted = false,
            Leaderboard;

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

        BootGameState.update = function() {
            LoadingText.angle = 5 * Math.cos(Game.time.now / 100);
        };

        /////////////////////////////////////
        //State - Preloader (Loading Assets) //
        /////////////////////////////////////
        var PreloaderGameState = new Phaser.State();

        PreloaderGameState.preload = function() {
            loadAssets();
        };

        PreloaderGameState.create = function() {
            var tween = Game.add.tween(LoadingText).to({
                alpha: 0
            }, 1000, Phaser.Easing.Linear.None, true);

            tween.onComplete.add(function() {
                Game.state.start('MainMenu', false, false);
            }, this);
        };

        PreloaderGameState.update = function() {
            LoadingText.angle = 5 * Math.cos(Game.time.now / 100);
        };

        //////////////////////
        //State - Main Menu //
        //////////////////////
        var MainMenuState = new Phaser.State();

        MainMenuState.create = function() {
            isScorePosted = false;

            createBackground();
            createRain();
            createClouds();
            createTown();
            createPipes(false);
            createBird();
            createTexts();
            createSounds();

            gameScore = 0;

            Bird.angle = 0;
            Bird.reset(Game.world.width / 10, Game.world.height / 2);
            Bird.body.allowGravity = false;
            Bird.body.gravity.y = 0;
            Bird.animations.play('flying');

            TitleText.setText(TITLE_TEXT);
            DeveloperText.setText(DEVELOPER_TEXT);
            GraphicText.setText(GRAPHIC_TEXT);
            InstructionsText.setText(INSTRUCTIONS_TEXT);
            ScoreText.setText("");
            HighScoreTitleText.setText("");
            HighScoreText.setText("");
            PostScoreText.setText("");

            Game.input.onDown.addOnce(function() {
                birdFlap();
                Game.state.start('Game', false, false);
            });
        };

        MainMenuState.update = function() {
            Bird.y = (Game.world.height / 2) + 32 * Math.cos(Game.time.now / 500);
            Bird.x = (Game.world.width / 10) + 64 * Math.sin(Game.time.now / 2000);

            Town.tilePosition.x -= Game.time.physicsElapsed * SPEED / 5;
            TitleText.angle = 5 * Math.cos(Game.time.now / 100);
            InstructionsText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
        };

        /////////////////////////////////////
        //Game state - Where game is going //
        /////////////////////////////////////
        var GameState = new Phaser.State();

        GameState.create = function() {
            createPipes(true);

            TitleText.setText("");
            DeveloperText.setText("");
            GraphicText.setText("");
            InstructionsText.setText("");
            HighScoreTitleText.setText("");
            HighScoreText.setText("");
            PostScoreText.setText("");
            ScoreText.setText(gameScore);

            Bird.body.allowGravity = true;
            Bird.body.gravity.y = GRAVITY;

            Game.input.onDown.add(birdFlap);
        };

        GameState.update = function() {
            Game.physics.overlap(Bird, Pipes, function() {
                Game.state.start('GameOver', false, false);
            });

            if (Bird.body.bottom >= Game.world.bounds.bottom || Bird.body.top <= Game.world.bounds.top) {
                Game.state.start('GameOver', false, false);
            }

            Bird.angle = (90 * (BIRD_FLAP + Bird.body.velocity.y) / BIRD_FLAP) - 180;
            if (Bird.angle < -30) {
                Bird.angle = -30;
            } else if (Bird.angle > 30) {
                Bird.angle = 30;
            }

            Game.physics.overlap(Bird, FreeSpacesInPipes, addScore);

            Town.tilePosition.x -= Game.time.physicsElapsed * getModifiedSpeed() / 5;
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
            getScore();

            Game.input.onDown.remove(birdFlap);
            setTimeout(function() {
                Game.input.onDown.add(HighScoreStateClick);
            }, 1000);

            HurtSound.play();

            Pipes.forEachAlive(function(pipe) {
                pipe.body.velocity.x = 0;
            });

            FreeSpacesInPipes.forEachAlive(function(spaceInPipe) {
                spaceInPipe.body.velocity.x = 0;
            });

            PipesTimer.stop();

            TitleText.setText("");
            DeveloperText.setText("");
            GraphicText.setText("");
            InstructionsText.setText("");
            ScoreText.setText("YOUR SCORE: " + gameScore);
            PostScoreText.setText(HIGHSCORE_SUBMIT);
            HighScoreTitleText.setText(HIGHSCORE_TITLE);
            HighScoreText.setText(LOADING_TEXT);

            Bird.angle = 180;
            Bird.animations.stop();
            Bird.frame = 3;
        };

        GameOverState.update = function() {
            ScoreText.angle = 1 * Math.sin(Game.time.now / 100);
            HighScoreTitleText.angle = 1 * Math.cos(Game.time.now / 100);
            PostScoreText.scale.setTo(1 + 0.1 * Math.cos(Game.time.now / 100), 1 + 0.1 * Math.sin(Game.time.now / 100));
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

        ///////////////////////
        //Post score to Clay //
        ///////////////////////
        var postScore = function postScore() {
            Leaderboard.post({
                score: gameScore
            }, function() {
                HighScoreText.setText(LOADING_TEXT);
                getScore();
            });
        };

        ////////////////////////////////////////////
        //Load Highscores from Clay and render it //
        ////////////////////////////////////////////
        var getScore = function getScore() {
            Leaderboard.fetch({
                sort: 'desc',
                best: true
            }, function(results) {
                if (Game.state.current == 'GameOver') {
                    var text = "";
                    for (var i in results) {
                        if (results.hasOwnProperty(i)) {
                            text += results[i].rank + '. ' + results[i].name + ' ' + results[i].score + '\n\n';
                        }
                    }
                    HighScoreText.setText(text);
                }
            });
        };

        var HighScoreStateClick = function HighScoreStateClick() {
            if (PostScoreClickArea && Phaser.Rectangle.contains(PostScoreClickArea, Game.input.x, Game.input.y) && !isScorePosted) {
                FlapSound.play();
                postScore();
                PostScoreText.setText("");
                isScorePosted = true;
            } else {
                Game.input.onDown.remove(HighScoreStateClick);
                Game.state.start('MainMenu', true, false);
            }
        };

        //////////////////////////////////////////
        //Get modified speed basic on gameScore //
        //////////////////////////////////////////
        var getModifiedSpeed = function getModifiedSpeed() {
            return SPEED + gameScore * 5;
        };

        ////////////////////////
        //Load assets in game //
        ////////////////////////
        var loadAssets = function loadAssets() {
            Game.load.spritesheet('bird', 'img/bird.png', 48, 35);
            Game.load.spritesheet('clouds', 'img/clouds.png', 64, 34);
            Game.load.spritesheet('rain', 'img/rain.png', 12, 13);

            Game.load.image('town', 'img/town.png');
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
            Background.beginFill(0x53BECE, 1);
            Background.drawRect(0, 0, Game.world.width, Game.world.height);
            Background.endFill();
        };

        ////////////////
        //Create Rain //
        ////////////////
        var createRain = function createRain() {
            var emitter = Game.add.emitter(Game.world.centerX, 0, 400);
            emitter.width = Game.world.width;
            emitter.height = Game.world.height;
            emitter.angle = 10;
            emitter.makeParticles('rain');
            emitter.maxParticleScale = 0.5;
            emitter.minParticleScale = 0.1;
            emitter.setYSpeed(300, 500);
            emitter.setXSpeed(-5, 5);
            emitter.minRotation = 0;
            emitter.maxRotation = 0;
            emitter.gravity = GRAVITY / 4;
            emitter.start(false, 1000, 5, 0);
        };

        //////////////////
        //Create clouds //
        //////////////////
        var createClouds = function createClouds() {
            function makeNewCloud(cloudX, startTimer) {
                cloudX = typeof cloudX == 'undefined' ? Game.world.width : cloudX;
                startTimer = typeof startTimer == 'undefined' ? true : false;

                var cloudY = Math.random() * Game.world.height / 2,
                    cloud = Clouds.create(cloudX, cloudY, 'clouds', Math.floor(21 * Math.random())),
                    cloudScale = 1 + Math.floor((4 * Math.random()));

                cloud.alpha = 1 / cloudScale * 2;
                cloud.scale.setTo(cloudScale, cloudScale);
                cloud.body.allowGravity = false;
                cloud.body.velocity.x = -SPEED / cloudScale * 0.5;
                cloud.anchor.setTo(0, 0.5);

                cloud.events.onOutOfBounds.add(function(cloud) {
                    cloud.kill();
                });

                if (startTimer) {
                    CloudsTimer.add(Game.rnd.integerInRange(CLOUDS_SHOW_MIN_TIME, CLOUDS_SHOW_MAX_TIME), makeNewCloud, this);
                }
            }

            Clouds = Game.add.group();

            var cloudX = 0;
            while (cloudX < Game.world.width) {
                makeNewCloud(cloudX, false);
                cloudX += Math.floor(Math.random() * 100);
            }

            CloudsTimer = Game.time.create(false);
            CloudsTimer.add(0, makeNewCloud, this);
            CloudsTimer.start();
        };

        /////////////////
        //Create Fence //
        /////////////////
        var createTown = function createTown() {
            Town = Game.add.tileSprite(0, Game.world.height - 128, Game.world.width, 128, 'town');
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
            Bird.body.gravity.y = 0;
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
                pipe.scale.setTo(2.5, isFlipped ? -2 : 2);
                pipe.body.offset.y = isFlipped ? -pipe.body.height * 2 : 0;
                pipe.body.velocity.x = -getModifiedSpeed();

                pipe.events.onOutOfBounds.add(function(pipe) {
                    pipe.kill();
                });

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
                spaceInPipe.body.velocity.x = -getModifiedSpeed();

                var newTime = Game.rnd.integerInRange(PIPE_SPAWN_MIN_INTERVAL, PIPE_SPAWN_MAX_INTERVAL) - getModifiedSpeed() * 2;
                PipesTimer.add(newTime < PIPE_SPAWN_MIN_INTERVAL ? PIPE_SPAWN_MIN_INTERVAL : newTime, makePipes, this);
            }

            if (timer) {
                PipesTimer = Game.time.create(false);
                PipesTimer.add(0, makePipes, this);
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

            DeveloperText = Game.add.text(Game.world.width / 6, 10, DEVELOPER_TEXT, {
                font: '13px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });

            GraphicText = Game.add.text(Game.world.width - Game.world.width / 6, 10, GRAPHIC_TEXT, {
                font: '13px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            GraphicText.anchor.x = 1;

            InstructionsText = Game.add.text(Game.world.width / 2, Game.world.height - Game.world.height / 6, INSTRUCTIONS_TEXT, {
                font: '16px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            InstructionsText.anchor.setTo(0.5, 0.5);

            ScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 4, "", {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            ScoreText.anchor.setTo(0.5, 0.5);

            HighScoreTitleText = Game.add.text(Game.world.width / 2, Game.world.height / 6, "", {
                font: '32px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            });
            HighScoreTitleText.anchor.setTo(0.5, 0.5);

            HighScoreText = Game.add.text(Game.world.width / 2, Game.world.height / 2, "", {
                font: '16px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            HighScoreText.anchor.setTo(0.5, 0.5);

            PostScoreText = Game.add.text(Game.world.width / 2, Game.world.height - Game.world.height / 4, "", {
                font: '16px "Press Start 2P"',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2,
                align: 'center'
            });
            PostScoreText.anchor.setTo(0.5, 0.5);
            PostScoreClickArea = new Phaser.Rectangle(PostScoreText.x - PostScoreText.width / 2, PostScoreText.y - PostScoreText.height / 2, PostScoreText.width, PostScoreText.height);
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

        var Game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.CANVAS, SCENE);
        Game.raf = new Phaser.RequestAnimationFrame(Game);
        Game.antialias = false;
        Game.raf.start();

        Game.state.add('Boot', BootGameState, false);
        Game.state.add('Preloader', PreloaderGameState, false);
        Game.state.add('MainMenu', MainMenuState, false);
        Game.state.add('Game', GameState, false);
        Game.state.add('GameOver', GameOverState, false);

        Game.state.start('Boot');

        Clay.ready(function() {
            Leaderboard = new Clay.Leaderboard({
                id: 2835
            });
        });
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