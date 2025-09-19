import Card from "./card.astro";

export default function Mode () {

    return (
        <div className="flex justify-center items-center">
            <button className="bg-white text-black border border-black p-1 cursor-pointer hover:scale-95 select-none duration-200 transition-all">
                    Switch Mode
            </button>
        </div>
    )
}