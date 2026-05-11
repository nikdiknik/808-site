import { SignInCloseButton } from "@/components/auth/sign-in-close-button";
import { SignInForm } from "@/components/auth/sign-in-form";

export function SignInPanel({
  initialError,
  modal,
}: {
  initialError?: string;
  modal?: boolean;
}) {
  return (
    <section className="relative w-full max-w-[480px] rounded-[30px] border border-white/6 bg-[#1E1E1E] p-5 shadow-2xl md:p-6">
      {modal ? (
        <SignInCloseButton />
      ) : null}

      <p className="heading-font text-[12px] uppercase text-[#78F761]">auth</p>
      <h1 className="heading-font mt-5 pr-10 text-[30px] leading-tight text-white">Войти в 808 Демок</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-[#C9C9C9]">Введи email — мы пришлём ссылку для входа</p>

      <div className="mt-6">
        <SignInForm initialError={initialError} />
      </div>
    </section>
  );
}
