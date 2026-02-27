import GameRoom from './GameRoom'

export default function RoomPage({ params }: { params: { code: string } }) {
  return <GameRoom roomCode={params.code.toUpperCase()} />
}
