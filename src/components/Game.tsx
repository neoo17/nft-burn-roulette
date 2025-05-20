import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
type Props = {
    socket: Socket;
    room: string;
    players: string[];
    me: string;
    currentTurnId: string;
    setCurrentTurnId: (id: string) => void; // <-- добавь это!
    shuffleUsed: [boolean, boolean];
    bet: number;
    rounds: number;
    roundWins: [number, number];
    currentRound: number;
};

export default function Game({ socket, room, players, me, currentTurnId, shuffleUsed: shuffleUsedProp, bet, rounds, roundWins: roundWinsProp, currentRound: currentRoundProp, setCurrentTurnId:setCurrentTurnId }: Props) {
    const [log, setLog] = useState<string[]>([]);
    const [mySocketId, setMySocketId] = useState<string>("");
    const [cards, setCards] = useState<(null | "safe" | "burn")[]>([null, null, null, null, null, null]);
    const [gameOver, setGameOver] = useState<null | { matchWinner: string; roundWins: [number, number] }>(null);
    const [shuffleUsed, setShuffleUsed] = useState<[boolean, boolean]>(shuffleUsedProp);
    const [roundWins, setRoundWins] = useState<[number, number]>(roundWinsProp);
    const [currentRound, setCurrentRound] = useState<number>(currentRoundProp);
    const [pendingNewRound, setPendingNewRound] = useState(false);

    useEffect(() => {
        setMySocketId(socket.id || "");

        socket.on("connect", () => {
            setMySocketId(socket.id || "");
        });

        socket.on("card_opened", (data) => {
            setCards((prev) => {
                const copy = [...prev];
                copy[data.cardIndex] = data.value;
                return copy;
            });
            setLog((l) => [
                ...l,
                `${data.by} открыл карту #${data.cardIndex + 1}: ${
                    data.value === "burn" ? "🔥 BURN!" : "Безопасно"
                }`
            ]);
        });

        // Когда раунд завершён, показываем результат
        socket.on("round_over", (data) => {
            setLog((l) => [
                ...l,
                `🏁 Раунд ${data.round}: выиграл ${data.winner} (счёт: ${data.roundWins[0]} : ${data.roundWins[1]})`
            ]);
            setRoundWins(data.roundWins);
            setPendingNewRound(true);
            setTimeout(() => setPendingNewRound(false), 2000); // Пауза 2 секунды
        });

        // Новый раунд: сбрасываем карты, обновляем номер раунда, обновляем счёт
        socket.on("new_round", (data) => {
            setCards([null, null, null, null, null, null]);
            setLog((l) => [
                ...l,
                `--- Новый раунд #${data.round} ---`
            ]);
            setCurrentRound(data.round);
            setRoundWins(data.roundWins);
            setShuffleUsed([false, false]);
        });

        // Победа в матче
        socket.on("game_over", (data) => {
            setGameOver(data);
            setLog((l) => [
                ...l,
                `🏆 Матч окончен! Победил: ${data.matchWinner} (счёт: ${data.roundWins[0]} : ${data.roundWins[1]})`
            ]);
        });

        socket.on("deck_shuffled", (data) => {
            setCards([null, null, null, null, null, null]);
            setLog((l) => [
                ...l,
                `Карты были перемешаны игроком: ${data.by}`
            ]);
            if (data.shuffleUsed) setShuffleUsed(data.shuffleUsed);
        });

        socket.on("turn", (data) => {
            if (data.currentTurnId) setCurrentTurnId(data.currentTurnId); // <-- ключевая строка!
            if (data.shuffleUsed) setShuffleUsed(data.shuffleUsed);
        });

        socket.on("start_game", (data) => {
            // если реванш — сбрасываем всё
            setCards([null, null, null, null, null, null]);
            setLog([`--- Новый матч! ---`]);
            setCurrentRound(1);
            setRoundWins([0, 0]);
            setGameOver(null);
            setShuffleUsed([false, false]);
        });

        return () => {
            socket.off("connect");
            socket.off("card_opened");
            socket.off("round_over");
            socket.off("new_round");
            socket.off("game_over");
            socket.off("deck_shuffled");
            socket.off("turn");
            socket.off("start_game");
        };
    }, [socket]);

    // синхронизируем пропсы с локальным стейтом при старте игры/реванше
    useEffect(() => {
        setShuffleUsed(shuffleUsedProp);
        setRoundWins(roundWinsProp);
        setCurrentRound(currentRoundProp);
    }, [shuffleUsedProp, roundWinsProp, currentRoundProp]);

    const isMyTurn = mySocketId && mySocketId === currentTurnId;
    const myIdx = players.findIndex((p) => p === me);
    const canShuffle = isMyTurn && !shuffleUsed[myIdx] && !gameOver;

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-900 text-white py-10">
            <div className="flex justify-between w-full max-w-xl mb-4">
                <div className="text-lg bg-gray-800 px-4 py-2 rounded">
                    Ставка: <b>{bet}</b> | Раундов: <b>{rounds}</b>
                </div>
                <div className="text-lg bg-gray-800 px-4 py-2 rounded">
                    Баланс: <span className="font-bold text-green-400">{/* выводить баланс */}</span>
                </div>
            </div>
            <h2 className="text-2xl mb-4">
                Игровая комната: <span className="text-blue-400">{room}</span>
            </h2>
            <div className="mb-2 font-bold">
                <b>Игроки:</b> {players.join(" vs ")} {me && < span > (вы: {me})</span>}
                </div>
                <div className="mb-2">
                <b>Счёт по раундам:</b> {players[0]} <span className="text-blue-300">{roundWins[0]}</span> : <span className="text-blue-300">{roundWins[1]}</span> {players[1]}

                <br/>
                <b>Текущий раунд:</b> {currentRound} / {rounds}
            </div>
            <div className="mb-2">
                {pendingNewRound
                    ? <span className="text-yellow-400 font-bold">Сейчас начнётся новый раунд...</span>
                    : isMyTurn
                        ? "Твой ход — выбери карту"
                        : `Ждём хода соперника...`}
            </div>
            <div className="flex space-x-3 mb-8">
                {cards.map((val, idx) => (
                    <button
                        key={idx}
                        className={`w-16 h-24 rounded border-2 flex items-center justify-center text-2xl text-white shadow-lg select-none transition
                        ${
                            val === "burn"
                                ? "bg-red-600 border-red-800"
                                : val === "safe"
                                    ? "bg-green-600 border-green-800"
                                    : isMyTurn && !gameOver && !val
                                        ? "bg-blue-700 border-blue-400 cursor-pointer hover:scale-105"
                                        : "bg-gray-700 border-gray-400"
                        }`}
                        disabled={!isMyTurn || !!val || !!gameOver}
                        onClick={() => socket.emit("make_move", {room, cardIndex: idx})}
                    >
                        {val === "burn" ? "💥" : val === "safe" ? "✅" : "?"}
                    </button>
                ))}
            </div>
            {canShuffle && (
                <button
                    className="px-4 py-2 bg-purple-600 rounded mx-2"
                    onClick={() => socket.emit("shuffle_deck", {room})}
                >
                    Перемешать карты (1 раз за игру)
                </button>
            )}
            {shuffleUsed[myIdx] && (
                <span className="text-xs text-purple-300 ml-2">Вы уже использовали перемешивание</span>
            )}
            {gameOver && (
                <div className="text-2xl mt-6 text-center">
                    <span className="block mb-2">💥 <b>Игра окончена!</b></span>
                    Победил: <span className="font-bold text-green-400">{gameOver.matchWinner}</span>
                    <br/>
                    <button
                        className="mt-4 px-4 py-2 bg-blue-500 rounded"
                        onClick={() => window.location.reload()}
                    >
                        Играть снова
                    </button>
                </div>
            )}
            <div className="w-full max-w-lg bg-gray-800 rounded p-4 mt-6">
                <div className="font-semibold mb-2">Лог событий:</div>
                <ul className="list-disc pl-4">
                    {log.map((x, i) => (
                        <li key={i}>{x}</li>
                    ))}
                </ul>
            </div>
            <div className="mt-4 text-xs text-gray-400">
                <div>Ваш socket.id: [{mySocketId}]</div>
                <div>Текущий ход: [{currentTurnId}]</div>
            </div>
        </div>
    );
}
