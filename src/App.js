import React, { useState } from 'react';
import './App.css';

function App() {
    const [history, setHistory] = useState([
        [
            { x: 150, y: 100, hasBall: false },
            { x: 300, y: 100, hasBall: false },
            { x: 450, y: 100, hasBall: false },
        ]
    ]);
    const [numMovesLimitLocked, setNumMovesLimitLocked] = useState(3);
    const [numMovesLimit, setNumMovesLimit] = useState(3);
    const [shellChoice, setShellChoice] = useState(null);
    const [transitionSpeed, setTransitionSpeed] = useState(200);
    const [participantName, setParticipantName] = useState('');
    const [gameLog, setGameLog] = useState([]);
    const [currentGameStartTime, setCurrentGameStartTime] = useState(null);
    const [gameEnded, setGameEnded] = useState(false); // 게임 종료 여부

    const boardWidth = 700;
    const boardHeight = 500;
    let numTransitions = 0;

    function numMovesDone() {
        return history.length - 1;
    }

    function isStarted() {
        return history[0].some(shell => shell.hasBall);
    }

    function isBallVisible() {
        return history.length === 1 && isStarted();
    }

    function isFinished() {
        return numMovesDone() === numMovesLimitLocked;
    }

    function handleDifficultyChange(e) {
        setNumMovesLimit(Number(e.target.value));
    }

    function handleSpeedChange(e) {
        setTransitionSpeed(Number(e.target.value));
    }

    function handleStartGame(e) {
        if (e) {
            e.preventDefault();
        }

        numTransitions = 0;

        const currShells = history[history.length - 1];
        const winningIndex = Math.floor(Math.random() * currShells.length);
        const newShells = currShells.map((shell, shellIndex) => {
            const newShell = Object.assign({}, shell);
            newShell.hasBall = shellIndex === winningIndex;
            return newShell;
        });

        setHistory([newShells]);
        setShellChoice(null);
        setNumMovesLimitLocked(numMovesLimit);
        setCurrentGameStartTime(new Date());
        setGameEnded(false); // 게임 재시작
    }

    function handleShellClick(shell) {
        if (!isFinished() || gameEnded) return; // 이미 선택했으면 클릭 무시

        setShellChoice(shell);
        setGameEnded(true); // 게임 종료

        const endTime = new Date();
        const responseTime = currentGameStartTime
            ? (endTime - currentGameStartTime) / 1000
            : 0;

        const logEntry = {
            timestamp: endTime.toISOString(),
            participantName: participantName || 'Anonymous',
            speed: transitionSpeed,
            moves: numMovesLimitLocked,
            isCorrect: shell.hasBall,
            responseTime: responseTime.toFixed(2)
        };

        setGameLog([...gameLog, logEntry]);
    }

    function downloadCSV() {
        if (gameLog.length === 0) {
            alert('기록된 데이터가 없습니다!');
            return;
        }

        const headers = ['Timestamp', 'Participant', 'Speed(ms)', 'Moves', 'Correct', 'ResponseTime(s)'];

        const csvContent = [
            headers.join(','),
            ...gameLog.map(log =>
                [
                    log.timestamp,
                    `"${log.participantName}"`, // 쌍따옴표로 감싸기
                    log.speed,
                    log.moves,
                    log.isCorrect ? 1 : 0,
                    log.responseTime
                ].join(',')
            )
        ].join('\n');

        // UTF-8 BOM 추가
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `shell_game_data_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 메모리 정리
        URL.revokeObjectURL(url);
    }

    function handleTransitionEnd() {
        numTransitions++;
        if (numTransitions % 3 === 0) {
            shuffleShells();
        }
    }

    function generateNewPositions() {
        const shellSize = 100;

        function generateNewPosition(position) {
            position.x = Math.floor(Math.random() * (boardWidth - shellSize));
            position.y = Math.floor(Math.random() * (boardHeight - shellSize));
            return position;
        }

        function isShellOverlap(acc, newPos) {
            return acc.some(({ x, y }) => {
                const overlapX = (newPos.x >= x - shellSize) && (newPos.x <= x + shellSize);
                const overlapY = (newPos.y >= y - shellSize) && (newPos.y <= y + shellSize);
                return overlapX && overlapY;
            });
        }

        const newPositions = history[history.length - 1]
            .reduce((acc, cur) => {
                const shell = Object.assign({}, cur);
                let newPos = generateNewPosition(shell);

                while (isShellOverlap(acc, newPos)) {
                    newPos = generateNewPosition(shell);
                }

                acc.push(newPos);
                return acc;
            }, []);

        return newPositions;
    }

    function shuffleShells() {
        if (isFinished()) {
            return;
        }

        const isFinalMove = numMovesDone() === numMovesLimitLocked - 1;

        const newShellPositions = isFinalMove
            ? finalShuffle(history[0])
            : generateNewPositions();

        setHistory(history.concat([newShellPositions]));
    }

    function finalShuffle(shells) {
        const avalablePositions = shells.map(({ x }) => x);

        const shuffledShells = shells.map(shell => {
            const randomIndex = Math.floor(Math.random() * avalablePositions.length);
            shell.x = avalablePositions[randomIndex];
            avalablePositions.splice(randomIndex, 1);
            return shell;
        });

        return shuffledShells;
    }

    function getBallClassNames() {
        const ballClassNames = ['ball'];

        if (isBallVisible()) {
            ballClassNames.push('ball--start');
        }

        if (shellChoice && shellChoice.hasBall) {
            ballClassNames.push('ball--win');
        }

        return ballClassNames.join(' ');
    }

    function Ball() {
        return <div
            className={getBallClassNames()}
            onAnimationEnd={shuffleShells}>
        </div>
    }

    const shellElements = history[history.length - 1]
        .map((shell, index) =>
            <div
                role="button"
                key={index}
                className="shell"
                onClick={() => handleShellClick(shell)}
                onTransitionEnd={handleTransitionEnd}
                style={{
                    transform: `translate(${shell.x}px, ${shell.y}px)`,
                    transition: `transform ${transitionSpeed}ms`,
                    cursor: (isFinished() && !gameEnded) ? 'pointer' : 'not-allowed', // 한 번만 클릭 가능
                    opacity: gameEnded ? 0.7 : 1 // 게임 끝나면 반투명
                }}
                disabled={!isFinished() || gameEnded}>
                {shell.hasBall && <Ball />}
            </div>
        );

    return (
        <div className="App" style={{ width: boardWidth }}>
            <h1>야바위 게임 실험</h1>

            <form className="form">
                <div className="form__section">
                    <div className="form__section-title">
                        <button
                            type="button"
                            className="form__title-btn form__title-btn--secondary"
                            onClick={downloadCSV}>
                            데이터 다운로드 (CSV)
                        </button>
                    </div>
                    <div className="form__section-content">
                        <h3>속도</h3>
                        <label className="form__label">
                            <input
                                type="radio"
                                name="speed"
                                value="200"
                                onChange={handleSpeedChange}
                                checked={transitionSpeed === 200}
                                disabled={isStarted() && !isFinished()} />
                            <span>매우 빠름 (200ms)</span>
                        </label>

                        <label className="form__label">
                            <input
                                type="radio"
                                name="speed"
                                value="350"
                                onChange={handleSpeedChange}
                                checked={transitionSpeed === 350}
                                disabled={isStarted() && !isFinished()} />
                            <span>빠름 (350ms)</span>
                        </label>

                        <label className="form__label">
                            <input
                                type="radio"
                                name="speed"
                                value="500"
                                onChange={handleSpeedChange}
                                checked={transitionSpeed === 500}
                                disabled={isStarted() && !isFinished()} />
                            <span>보통 (500ms)</span>
                        </label>

                        <label className="form__label">
                            <input
                                type="radio"
                                name="speed"
                                value="650"
                                onChange={handleSpeedChange}
                                checked={transitionSpeed === 650}
                                disabled={isStarted() && !isFinished()} />
                            <span>느림 (650ms)</span>
                        </label>
                    </div>
                </div>

                <div className="form__section">
                    <div className="form__section-title">
                        <div className="form__title-input-wrapper">
                            <input
                                type="text"
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="이름 입력"
                                disabled={isStarted() && !isFinished()}
                                className="form__title-input"
                            />
                        </div>
                    </div>
                    <div className="form__section-content">
                        <h3>횟수</h3>
                        <label className="form__label">
                            <input
                                type="radio"
                                name="difficulty"
                                value="3"
                                onChange={handleDifficultyChange}
                                checked={numMovesLimit === 3}
                                disabled={isStarted() && !isFinished()} />
                            <span>3회</span>
                        </label>

                        <label className="form__label">
                            <input
                                type="radio"
                                name="difficulty"
                                value="5"
                                onChange={handleDifficultyChange}
                                checked={numMovesLimit === 5}
                                disabled={isStarted() && !isFinished()} />
                            <span>5회</span>
                        </label>

                        <label className="form__label">
                            <input
                                type="radio"
                                name="difficulty"
                                value="7"
                                onChange={handleDifficultyChange}
                                checked={numMovesLimit === 7}
                                disabled={isStarted() && !isFinished()} />
                            <span>7회</span>
                        </label>

                        <label className="form__label">
                            <input
                                type="radio"
                                name="difficulty"
                                value="9"
                                onChange={handleDifficultyChange}
                                checked={numMovesLimit === 9}
                                disabled={isStarted() && !isFinished()} />
                            <span>9회</span>
                        </label>
                    </div>
                </div>
            </form>

            <div style={{ textAlign: 'center', margin: '40px 0' }}>
                <button
                    type="button"
                    className="start-btn"
                    onClick={handleStartGame}
                    disabled={isStarted() && numMovesDone() < numMovesLimitLocked}>
                    START
                </button>
            </div>

            <div className="board" style={{ height: boardHeight }}>
                <div className="board__result">
                    {shellChoice && (shellChoice.hasBall ? '정답! 🎉' : '오답! ❌')}
                </div>
                {shellElements}
            </div>

            <footer className="app-footer"></footer>
        </div>
    )
}

export default App;