import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(2000)
  question: string;
}
