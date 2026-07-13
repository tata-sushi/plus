import { Header } from '../components/Header.jsx'

const OUVIDORIA_URL = 'https://ouvidoria.tatasushi.tech/'

export function Ouvidoria() {
  return (
    <div className="-mb-24 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col">
      <Header />
      <iframe
        src={OUVIDORIA_URL}
        title="Ouvidoria Tatá"
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-write; camera; microphone; geolocation"
      />
    </div>
  )
}
