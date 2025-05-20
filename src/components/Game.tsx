import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

type Props = {
    socket: Socket;
    room: string;
    players: string[];
    me: string;
    currentTurnId: string;
    shuffleUsed: [boolean, boolean];
};

export default function Game({ socket, room, players, me, currentTurnId, shuffleUsed }: Props) {
    const [log, setLog] = useState<string[]>([]);
    const [mySocketId, setMySocketId] = useState<string>("");
    const [cards, setCards] = useState<(null | "safe" | "burn")[]>([null, null, null, null, null, null]);
    const [gameOver, setGameOver] = useState<null | { winner: string; loser: string; burnAt: number }>(null);

    useEffect(() => {
        setMySocketId(socket.id || "");

        socket.on("connect", () => {
            setMySocketId(socket.id || "");
        });

        socket.on("move_result", (data) => {
            setLog((l) => [...l, `${data.by}: сделал ход`]);
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

        socket.on("game_over", (data) => {
            setGameOver(data);
            setLog((l) => [
                ...l,
                `🔥 BURN! Победил: ${data.winner}`
            ]);
        });

        socket.on("deck_shuffled", (data) => {
            setCards([null, null, null, null, null, null]);
            setLog((l) => [
                ...l,
                `Карты были перемешаны игроком: ${data.by}`
            ]);
        });

        return () => {
            socket.off("connect");
            socket.off("move_result");
            socket.off("card_opened");
            socket.off("game_over");
            socket.off("deck_shuffled");
        };
    }, [socket]);

    const isMyTurn = mySocketId && mySocketId === currentTurnId;
    const myIdx = players.findIndex((p) => p === me);
    const canShuffle = isMyTurn && !shuffleUsed[myIdx] && !gameOver;

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-900 text-white py-10">
            <h2 className="text-2xl mb-4">
                Игровая комната: <span className="text-blue-400">{room}</span>
            </h2>
            <div className="mb-4">
                <b>Игроки:</b> {players.join(" vs ")} {me && <span>(вы: {me})</span>}
                </div>
                <div className="mb-2">
            {isMyTurn
                ? "Твой ход — выбери карту"
                : `Ждём хода соперника...`}
            </div>
            {/* UI 6 карт */}
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
                        onClick={() => socket.emit("make_move", { room, cardIndex: idx })}
                    >
                        {val === "burn" ? "💥" : val === "safe" ? "✅" : "?"}
                    </button>
                ))}
            </div>
            {/* Кнопка Shuffle */}
            {canShuffle && (
                <button
                    className="px-4 py-2 bg-purple-600 rounded mx-2"
                    onClick={() => socket.emit("shuffle_deck", { room })}
                >
                    Перемешать карты (1 раз за игру)
                </button>
            )}
            {shuffleUsed[myIdx] && (
                <span className="text-xs text-purple-300 ml-2">Вы уже использовали перемешивание</span>
            )}
            {/* Завершение игры */}
            {gameOver && (
                <div className="text-2xl mt-6 text-center">
                    <span className="block mb-2">💥 <b>Игра окончена!</b></span>
                    Победил: <span className="font-bold text-green-400">{gameOver.winner}</span>
                    <br />
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
