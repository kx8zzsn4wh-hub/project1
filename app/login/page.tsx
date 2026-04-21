import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ログイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-700">
            ログインと新規登録は、画面右上の <span className="font-semibold">Login</span> ボタンからダイアログで行えます。
          </p>

          <Link href="/" className={`${buttonVariants()} w-full`}>
            トップへ戻る
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
