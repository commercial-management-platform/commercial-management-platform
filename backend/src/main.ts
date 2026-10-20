import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

const { data, error } = await supabase
    .from('tu_tabla')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error de Supabase:', error)
    return
  }

  console.log('✅ Conexión con Supabase exitosa')
  console.log(data)
}

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
