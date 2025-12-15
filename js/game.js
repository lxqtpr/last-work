class CutShapeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.playerName = GameStorage.getPlayerName();
        this.difficulty = GameStorage.getDifficulty();

        this.difficultySettings = {
            easy: {
                cutsRequired: 2,
                timeLimit: 90,
                scoreMultiplier: 1,
                levels: 3,
                questionsPerLevel: 3,
                MoveXIntensity: 0,
                MoveYIntensity: 0,
                RotationIntensity: 0,
            },
            medium: {
                cutsRequired: 3,
                timeLimit: 75,
                scoreMultiplier: 1.5,
                levels: 4,
                questionsPerLevel: 3,
                MoveXIntensity: 50,
                MoveYIntensity: 0,
                RotationIntensity: 0,
            },
            hard: {
                cutsRequired: 4,
                timeLimit: 60,
                scoreMultiplier: 2,
                levels: 5,
                questionsPerLevel: 3,
                MoveXIntensity: 10,
                MoveYIntensity: 20,
                RotationIntensity: 30,
            }
        };

        this.settings = this.difficultySettings[this.difficulty];

        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.currentQuestion = 1;
        this.timeLeft = this.settings.timeLimit;
        this.isGameOver = false;
        this.isPaused = false;
        this.isAnswered = false;

        this.polygon = null;
        this.cuts = [];
        this.currentCut = null;
        this.polygonParts = [];

        this.time = 0;
        this.endTransition = 0;

        this.timerInterval = null;

        this.currentTask = null;

        this.init();
    }

    init() {
        this.updateUI();
        this.setupEventListeners();
        this.generateNewTask();
        this.startTimer();
        this.render();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.cancelCurrentCut();
        });

        this.canvas.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.clearCuts();
        });
        
        document.getElementById('goToMenu').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('clearCuts').addEventListener('click', () => this.clearCuts());
        document.getElementById('submitCuts').addEventListener('click', () => this.checkAnswer());
        document.getElementById('skipLevel').addEventListener('click', () => this.skipLevel());

        document.getElementById('nextLevel').addEventListener('click', () => this.nextLevel());
        document.getElementById('restartGame').addEventListener('click', () => this.restartGame());
        document.getElementById('viewResults').addEventListener('click', () => {
            window.location.href = 'rating.html';
        });
        

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }
    
    getTransformMatrix() {
        let center = new DOMPoint(this.canvas.width/2,this.canvas.height/2);

        return (new DOMMatrix())
            .translate(center.x,center.y)
            .rotate( (1-this.endTransition) * Math.sin(this.time*0.0021) * this.settings.RotationIntensity)
            .translate( (1-this.endTransition) * Math.sin(this.time*0.002) * this.settings.MoveXIntensity,
                        (1-this.endTransition) * Math.cos(this.time*0.002) * this.settings.MoveYIntensity)
            .translate(-center.x,-center.y);
    }

    transformPoint(point) {
        const rect = this.canvas.getBoundingClientRect(); 

        const matrix = this.getTransformMatrix().inverse();
        let pointPX = 
            new DOMPoint(
                (point.x - (rect.left) ) , 
                (point.y - (rect.top ) ) 
            )
        const x = (pointPX.x)/this.canvas.clientWidth * this.canvas.width ;
        const y = (pointPX.y)/this.canvas.clientHeight * this.canvas.height ;
        pointPX = new DOMPoint(x,y)
        pointPX = matrix.transformPoint(pointPX);

        return pointPX;
    }

    handleClick(e) {
        if (this.isGameOver || this.isPaused) return;
        if(this.isAnswered) {
            return;
        }
        const point = this.transformPoint({x: e.clientX, y: e.clientY});

        if (!this.currentCut) {
            this.currentCut = { start: point, end: {x: e.clientX, y: e.clientY} };
        } else {
            this.currentCut.end = point;

            const distance = Geometry.distance(this.currentCut.end, this.currentCut.start);

            if (distance < 20) {
                this.showFeedback('Разрез слишком короткий!', 'error');
                this.currentCut = null;
                return;
            }

            this.addCut(this.currentCut);
            this.currentCut = null;
            this.updateCutsCount();
        }
    }

    handleMouseMove(e) {
        if (!this.currentCut) return;

        this.currentCut.end = {x: e.clientX, y: e.clientY};
    }

    handleKeyPress(e) {
        if (this.isGameOver || this.isAnswered ) return;

        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.clearCuts();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.cuts.length > 0) {
                    this.checkAnswer();
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (confirm('Выйти в главное меню? Прогресс будет потерян.')) {
                    window.location.href = 'index.html';
                }
                break;
        }
    }

    generateNewTask() {
        const sides = 3 + Math.floor(Math.random() * 3) + Math.floor(this.currentLevel / 2);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 150 + this.currentLevel * 10;

        if (this.currentQuestion % 2 === 0) {
            this.polygon = Geometry.generateRegularPolygon(sides, centerX, centerY, radius);
        } else {
            this.polygon = Geometry.generatePolygon(sides, centerX, centerY, radius);
        }

        this.cuts = [];
        this.currentCut = null;
        this.polygonParts = [];
        this.endTransition = 0;
        this.isAnswered = false;

        this.settings.cutsRequired = sides - 2;
        this.partsCount = sides - 1;
        const partCountMessage = this.getPluralWord(this.partsCount, 'равную часть', 'равные части', 'равных частей');
        const cutCountMessage = this.getPluralWord(this.settings.cutsRequired, 'разрез', 'разреза', 'разрезов')
        const taskDescriptions = [
            `Разрежьте ${sides}-угольник на ${this.partsCount} ${partCountMessage} за ${this.settings.cutsRequired} ${cutCountMessage}`,
            `Разделите фигуру на ${this.partsCount} ${partCountMessage} (${this.settings.cutsRequired} ${cutCountMessage})`,
            `Сделайте ${this.settings.cutsRequired} ${cutCountMessage}, чтобы получить ${this.partsCount} ${partCountMessage}`
        ];

        this.currentTask = taskDescriptions[Math.floor(Math.random() * taskDescriptions.length)];
        document.getElementById('taskDescription').textContent = this.currentTask;
        document.getElementById('cutsRequired').textContent = this.settings.cutsRequired;

        this.updateHint();
        this.updateCutsCount();
    }

    updateHint() {
        const hints = [
            'Попробуйте разрезать фигуру через центр',
            'Меньше разрезов - больше бонусных очков!',
            'Симметричные разрезы дадут равные площади',
            'Представьте фигуру как пиццу - режьте от центра',
            'Используйте геометрическую симметрию'
        ];

        document.getElementById('hintText').textContent = hints[Math.floor(Math.random() * hints.length)];
    }

    addCut(cut) {
        if(this.isAnswered) {
            return;
        }
        if (this.cuts.length >= this.settings.cutsRequired) {
            this.showFeedback(`Максимум ${this.settings.cutsRequired} разрезов!`, 'error');
            return;
        }
        this.cuts.push(cut);
    }

    clearCuts() {
        if(this.isAnswered) {
            return;
        }
        
        this.cuts = [];
        this.currentCut = null;
        this.polygonParts = [];
        this.updateCutsCount();
        this.playSound('clear');
    }

    cancelCurrentCut() {
        if (this.currentCut) {
            this.currentCut = null;
        }
    }

    updateCutsCount() {
        document.getElementById('cutsCount').textContent = this.cuts.length;
        const submitBtn = document.getElementById('submitCuts');
        // Кнопка активна только когда есть хотя бы один разрез
        submitBtn.disabled = this.cuts.length === 0;
    }

    checkAnswer() {
        if(this.isAnswered) {
            return;
        }
        if (this.cuts.length === 0) {
            this.showFeedback('Необходимо сделать хотя бы один разрез!', 'error');
            return;
        }

        const polygonParts = this.splitPolygonWithCuts();

        if (polygonParts.length < 2) {
            this.showFeedback('Разрезы должны проходить через фигуру. Попробуйте снова.', 'error');
            this.clearCuts();
            return;
        }
        
        if (polygonParts.length !== this.partsCount) {
            this.showFeedback(`Необходимо получить ${this.partsCount} ${this.getPluralWord(this.partsCount, 'часть', 'части', 'частей')}!`, 'error');
            this.lives -= 1;
            this.updateUI();
            this.playSound('error');
            if(this.lives === 0){
                this.gameOver(false);
                return;
            }
            return;
        }

        this.polygonParts = polygonParts

        const accuracy = Geometry.calculateAccuracy(this.polygonParts);

        const baseScore = 100 * this.settings.scoreMultiplier;
        const accuracyBonus = Math.floor(accuracy * 100 * this.settings.scoreMultiplier);
        const timeBonus = Math.floor(this.timeLeft * this.settings.scoreMultiplier);

        const cutsBonus = (this.settings.cutsRequired - this.cuts.length) * 30 * this.settings.scoreMultiplier;

        const totalScore = baseScore + accuracyBonus + timeBonus + cutsBonus;

        let quality = '';

        if (accuracy >= 0.95) {
            quality = 'Идеально! 🌟';
        } else if (accuracy >= 0.85) {
            quality = 'Отлично! ⭐';
        } else if (accuracy >= 0.70) {
            quality = 'Хорошо! ✓';
        } else if (accuracy >= 0.50) {
            quality = 'Неплохо';
        } else {
            quality = 'Можно лучше';
        }

        this.score += totalScore;

        this.showFeedback(
            `${quality} Точность: ${Math.round(accuracy * 100)}% | Разрезов: ${this.cuts.length} | +${totalScore} очков`,
            'success'
        );
        this.playSound('success');

        this.endTransition = 0.001;
        this.isAnswered = true;
        
        // Автоматически переходим к следующему вопросу через 2 секунды
        setTimeout(() => {
            if (this.currentQuestion < this.settings.questionsPerLevel) {
                this.currentQuestion++;
                this.generateNewTask();
                this.updateUI();
            } else {
                this.completeLevel();
            }
        }, 3000);
    }

    splitPolygonWithCuts() {
        let parts = [this.polygon];

        for (const cut of this.cuts) {
            const newParts = [];

            for (const part of parts) {
                const split = Geometry.splitPolygon(part, cut);

                if (split && split.length === 2) {
                    newParts.push(...split);
                } else {
                    newParts.push(part);
                }
            }

            parts = newParts;
        }

        return parts;
    }

    skipLevel() {
        if(this.isAnswered){
            return
        }
        if (confirm('Пропустить уровень? Вы потеряете 50 очков.')) {
            this.score = Math.max(0, this.score - 50);

            // Не теряем жизнь при пропуске
            if (!this.isGameOver) {
                if (this.currentQuestion < this.settings.questionsPerLevel) {
                    this.currentQuestion++;
                    this.generateNewTask();
                } else {
                    this.completeLevel();
                }
            }

            this.updateUI();
        }
    }

    showSolution() {
        // Заменяем на простую подсказку вместо автоматического решения
        this.showHint();
    }

    showHint() {
        // Показываем полезную подсказку игроку
        const partsCount = this.settings.cutsRequired + 1;
        const center = Geometry.getCentroid(this.polygon);

        // Рисуем линии-подсказки (полупрозрачные)
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);

        if (partsCount === 3) {
            // Для 3 частей - показываем 2 направления разрезов
            const hints = [
                { angle: Math.PI / 6, text: 'Попробуйте 2 разреза под углом ~60°' },
                { angle: Math.PI / 3, text: 'Или разрежьте вертикально и горизонтально' }
            ];

            const hint = hints[Math.floor(Math.random() * hints.length)];

            // Рисуем подсказочные линии
            for (let i = 0; i < 2; i++) {
                const angle = hint.angle * (i + 0.5);
                this.ctx.beginPath();
                this.ctx.moveTo(center.x - Math.cos(angle) * 200, center.y - Math.sin(angle) * 200);
                this.ctx.lineTo(center.x + Math.cos(angle) * 200, center.y + Math.sin(angle) * 200);
                this.ctx.stroke();
            }

            this.showFeedback(hint.text, 'success');
        } else {
            // Для 4+ частей - показываем радиальные направления
            const angleStep = (Math.PI * 2) / partsCount;

            for (let i = 0; i < this.settings.cutsRequired; i++) {
                const angle = -Math.PI / 2 + angleStep * i;
                this.ctx.beginPath();
                this.ctx.moveTo(center.x, center.y);
                this.ctx.lineTo(
                    center.x + Math.cos(angle) * 150,
                    center.y + Math.sin(angle) * 150
                );
                this.ctx.stroke();
            }

            this.showFeedback(
                `💡 Попробуйте ${this.settings.cutsRequired} разреза через центр фигуры под равными углами`,
                'success'
            );
        }

        this.ctx.restore();

        // Обновляем текстовую подсказку
        const hintTexts = {
            2: 'Для 3 частей: попробуйте разрезы под углом 60° друг к другу',
            3: 'Для 4 частей: разрежьте через центр крест-накрест',
            4: 'Для 5 частей: как звезда - разрезы через центр под углом 72°'
        };

        document.getElementById('hintText').textContent =
            hintTexts[this.settings.cutsRequired] || 'Разрезайте фигуру через центр равномерно';

        // Небольшой штраф за подсказку
        this.score = Math.max(0, this.score - 10);
        this.updateUI();
        this.playSound('success');
    }

    completeLevel() {
        const modal = document.getElementById('levelCompleteModal');
        document.getElementById('levelScore').textContent = this.score;

        modal.classList.add('show');
        this.isPaused = true;
        this.playSound('levelComplete');
    }
    getPluralWord(n, One, Two, Five) {
        n = Math.abs(n) % 100;
        const last = n % 10;

        if (n > 10 && n < 20) return Five;       // 11–19
        if (last === 1) return One;             // 1, 21, 31...
        if (last >= 2 && last <= 4) return Two; // 2–4, 22–24...
        return Five;                            // 5–9, 0
    }

    nextLevel() {
        document.getElementById('levelCompleteModal').classList.remove('show');
        this.isPaused = false;

        if (this.currentLevel < this.settings.levels) {
            this.currentLevel++;
            this.currentQuestion = 1;
            this.timeLeft = this.settings.timeLimit;
            this.generateNewTask();
            this.updateUI();
        } else {
            this.gameOver(true);
        }
    }

    gameOver(isWin) {
        this.isGameOver = true;
        this.stopTimer();

        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');

        if (isWin) {
            title.textContent = '🎉 Поздравляем! Вы победили!';
            message.textContent = `Вы прошли все ${this.settings.levels} уровня!`;
        } else {
            title.textContent = '😢 Игра окончена';
            message.textContent = 'К сожалению, у вас закончились жизни.';
        }

        document.getElementById('finalScore').textContent = this.score;

        GameStorage.saveGameResult(
            this.playerName,
            this.score,
            this.currentLevel,
            this.difficulty
        );

        modal.classList.add('show');
        this.playSound('gameOver');
    }

    restartGame() {
        window.location.href = 'index.html';
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.isPaused || this.isGameOver) return;

            this.timeLeft--;
            this.updateUI();

            if (this.timeLeft <= 10) {
                document.getElementById('timer').classList.add('warning');
            }

            if (this.timeLeft <= 0) {
                this.gameOver(false);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    updateUI() {
        document.getElementById('currentPlayer').textContent = this.playerName;
        document.getElementById('currentDifficulty').textContent = {
            easy: 'Легкий',
            medium: 'Средний',
            hard: 'Сложный'
        }[this.difficulty];

        document.getElementById('timer').textContent = this.timeLeft;
        document.getElementById('score').textContent = this.score;
        document.getElementById('currentLevel').textContent =
            `${this.currentLevel}.${this.currentQuestion}`;
        document.getElementById('lives').textContent = '❤️'.repeat(this.lives);
    }

    render(delta = 0) {
        if(this.endTransition > 0)
            this.endTransition = Math.min(1, this.endTransition + (delta - this.time) * 0.004)

        this.time = delta

        this.ctx.resetTransform();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.setTransform(this.getTransformMatrix());

        if (this.polygonParts.length > 0) {
            this.drawPolygonParts();
        } else {
            this.drawPolygon(this.polygon);
        }

        this.drawCuts();

        if (this.currentCut) {
            this.drawCurrentCut();
        }

        const center = Geometry.getCentroid(this.polygon);
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
        this.ctx.fill();

        requestAnimationFrame((delta) => {this.render(delta)});
    }

    drawPolygon(points, fillColor = 'rgba(102, 126, 234, 0.2)', strokeColor = '#667eea') {
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        this.ctx.closePath();

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        points.forEach((point, index) => {
            this.ctx.fillStyle = '#764ba2';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawPolygonParts() {
        const colors = [
            'rgba(255, 99, 132, 0.3)',
            'rgba(54, 162, 235, 0.3)',
            'rgba(255, 206, 86, 0.3)',
            'rgba(75, 192, 192, 0.3)',
            'rgba(153, 102, 255, 0.3)',
            'rgba(255, 159, 64, 0.3)'
        ];

        this.polygonParts.forEach((part, index) => {
            this.drawPolygon(part, colors[index % colors.length], '#ff0000');

            const center = Geometry.getCentroid(part);
            const area = Math.round(Geometry.calculateArea(part));

            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(area, center.x, center.y);
        });
    }

    drawCuts() {
        this.cuts.forEach(cut => {
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);

            this.ctx.beginPath();
            this.ctx.moveTo(cut.start.x, cut.start.y);
            this.ctx.lineTo(cut.end.x, cut.end.y);
            this.ctx.stroke();

            this.ctx.setLineDash([]);

            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(cut.start.x, cut.start.y, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(cut.end.x, cut.end.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawCurrentCut() {
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);

        const currentEnd = this.transformPoint(this.currentCut.end);

        this.ctx.beginPath();
        this.ctx.moveTo(this.currentCut.start.x, this.currentCut.start.y);
        this.ctx.lineTo(currentEnd.x, currentEnd.y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#f39c12';
        this.ctx.beginPath();
        this.ctx.arc(this.currentCut.start.x, this.currentCut.start.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    showFeedback(message, type) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `feedback ${type} show`;

        setTimeout(() => {
            feedback.classList.remove('show');
        }, 2000);
    }

    playSound(type) {
        // Простая звуковая обратная связь через Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch(type) {
            case 'click':
                oscillator.frequency.value = 400;
                gainNode.gain.value = 0.1;
                break;
            case 'cut':
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.15;
                break;
            case 'success':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.2;
                break;
            case 'error':
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.2;
                break;
            case 'clear':
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.1;
                break;
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const game = new CutShapeGame();
});
