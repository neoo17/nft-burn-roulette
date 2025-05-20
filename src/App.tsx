import React, { useState } from "react";
import { io, Socket } from "socket.io-client";
import Game from "./components/Game";

const socket: Socket = io("https://nft-burn-roulette-backand-production.up.railway.app");

type PendingGame = {
    id: string;
    creatorId: string;
    creatorName: string;
    bet: number;
};

export default function App() {
    const [name, setName] = useState("");
    const [balance, setBalance] = useState<number>(1000);
    const [inLobby, setInLobby] = useState(false);
    const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
    const [creatingGame, setCreatingGame] = useState(false);
    const [joiningGame, setJoiningGame] = useState(false);
    const [bet, setBet] = useState<number>(100);
    const [gameState, setGameState] = useState<any>(null); // start_game info
    const [currentTurnId, setCurrentTurnId] = useState<string>("");
    const [shuffleUsed, setShuffleUsed] = useState<[boolean, boolean]>([false, false]);
    const [players, setPlayers] = useState<string[]>([]);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);

    React.useEffect(() => {
        socket.on("balance", (data) => setBalance(data.balance));
        socket.on("lobby", () => {
            setInLobby(true);
            setGameState(null);
            setPendingGames([]);
            setWaitingForOpponent(false);
            socket.emit("list_games");
            socket.emit("get_balance");
        });
        socket.on("pending_games", (list) => setPendingGames(list));
        socket.on("start_game", (data) => {
            setGameState(data);
            setPlayers(data.players);
            setCurrentTurnId(data.currentTurnId);
            setShuffleUsed(data.shuffleUsed || [false, false]);
            setInLobby(false);
            setWaitingForOpponent(false);
        });
        socket.on("turn", (data) => {
            setCurrentTurnId(data.currentTurnId || "");
            if (data.shuffleUsed) setShuffleUsed(data.shuffleUsed);
        });
        socket.on("error_msg", (data) => {
            alert(data.msg);
            setWaitingForOpponent(false);
        });

        return () => {
            socket.off("balance");
            socket.off("lobby");
            socket.off("pending_games");
            socket.off("start_game");
            socket.off("turn");
            socket.off("error_msg");
        };
    }, []);

    function handleLogin() {
        if (!name.trim()) return;
        localStorage.setItem("roulette_username", name);
        socket.emit("login", { name });
    }

    function handleCreateGame() {
        if (bet < 1) return;
        socket.emit("create_game", { bet });
        setCreatingGame(false);
        setWaitingForOpponent(true);
    }

    function handleJoinGame(id: string) {
        socket.emit("join_game", { id });
        setJoiningGame(false);
    }

    function handleCancelWaiting() {
        setWaitingForOpponent(false);
        socket.emit("cancel_pending_game");
        socket.emit("lobby");
    }

    // ======= UI =======

    // Логин
    if (!name)
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
                <h1 className="text-3xl mb-8 font-bold">NFT Burn Roulette</h1>
                <input
                    className="p-2 rounded text-black mb-4"
                    placeholder="Введите ник"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button
                    className="px-6 py-2 bg-blue-600 rounded font-semibold"
                    onClick={handleLogin}
                >
                    Войти
                </button>
            </div>
        );

    // Ожидание соперника
    if (waitingForOpponent)
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
                <div className="fixed top-2 right-4 text-xl bg-gray-800 px-4 py-2 rounded">
                    Баланс: <span className="font-bold text-green-400">{balance}</span>
                </div>
                <h1 className="text-3xl mb-8 font-bold">NFT Burn Roulette</h1>
                <div className="flex flex-col items-center justify-center bg-gray-800 p-8 rounded shadow-xl">
                    <div className="text-2xl mb-4">Ожидание соперника...</div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
                    <button
                        className="mt-2 px-4 py-2 bg-gray-600 rounded"
                        onClick={handleCancelWaiting}
                    >
                        Отменить ожидание
                    </button>
                </div>
            </div>
        );

    // Игра
    if (gameState)
        return (
            <div>
                <div className="fixed top-2 right-4 text-xl bg-gray-800 px-4 py-2 rounded">
                    Баланс: <span className="font-bold text-green-400">{balance}</span>
                </div>
                <Game
                    socket={socket}
                    room={gameState.room}
                    players={gameState.players}
                    me={name}
                    currentTurnId={currentTurnId}
                    shuffleUsed={shuffleUsed}
                />
                <div className="fixed top-2 left-4 text-md bg-gray-700 px-3 py-1 rounded">
                    Ставка: <b>{gameState.bet}</b>
                </div>
            </div>
        );

    // Лобби
    if (inLobby)
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
                <div className="fixed top-2 right-4 text-xl bg-gray-800 px-4 py-2 rounded">
                    Баланс: <span className="font-bold text-green-400">{balance}</span>
                </div>
                <h1 className="text-3xl mb-4 font-bold">Лобби NFT Burn Roulette</h1>
                <div className="flex gap-4 mb-8">
                    <button
                        className="px-6 py-2 bg-blue-600 rounded font-semibold"
                        onClick={() => setCreatingGame(true)}
                    >
                        Создать игру
                    </button>
                    <button
                        className="px-6 py-2 bg-green-600 rounded font-semibold"
                        onClick={() => {
                            socket.emit("list_games");
                            setJoiningGame(true);
                        }}
                    >
                        Присоединиться к игре
                    </button>
                </div>

                {creatingGame && (
                    <div className="mb-6 p-4 bg-gray-800 rounded shadow-xl">
                        <h2 className="mb-2">Создать игру</h2>
                        <input
                            type="number"
                            min={1}
                            className="p-2 rounded text-black mb-2"
                            value={bet}
                            onChange={e => setBet(Number(e.target.value))}
                        />
                        <button className="ml-4 px-4 py-2 bg-blue-500 rounded" onClick={handleCreateGame}>
                            ОК
                        </button>
                        <button className="ml-2 px-4 py-2 bg-gray-600 rounded" onClick={() => setCreatingGame(false)}>
                            Отмена
                        </button>
                    </div>
                )}

                {joiningGame && (
                    <div className="mb-6 p-4 bg-gray-800 rounded shadow-xl min-w-[350px]">
                        <h2 className="mb-2">Доступные игры</h2>
                        {pendingGames.length === 0 && <div>Нет открытых игр</div>}
                        <ul>
                            {pendingGames.map((g) => (
                                <li key={g.id} className="mb-2 flex items-center justify-between">
                                    <span>
                                        <b>{g.creatorName}</b> — ставка <b>{g.bet}</b>
                                    </span>
                                    <button
                                        className="ml-4 px-3 py-1 bg-green-500 rounded"
                                        onClick={() => handleJoinGame(g.id)}
                                    >
                                        Присоединиться
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <button className="mt-2 px-4 py-2 bg-gray-600 rounded" onClick={() => setJoiningGame(false)}>
                            Закрыть
                        </button>
                    </div>
                )}
            </div>
        );

    // Дефолт — форма логина (на всякий случай)
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
            <h1 className="text-3xl mb-8 font-bold">NFT Burn Roulette</h1>
            <input
                className="p-2 rounded text-black mb-4"
                placeholder="Введите ник"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <button
                className="px-6 py-2 bg-blue-600 rounded font-semibold"
                onClick={handleLogin}
            >
                Войти
            </button>
        </div>
    );
}
