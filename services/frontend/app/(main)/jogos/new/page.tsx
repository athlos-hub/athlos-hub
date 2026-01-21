import { CreateLiveForm } from "@/components/livestream/create-live-form";

export default function NewLivePage() {
  return (
    <div className="py-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nova Live</h1>
        <p className="text-muted-foreground mt-1">
          Crie uma nova transmissão ao vivo
        </p>
      </div>

      <CreateLiveForm />
    </div>
  );
}
